-- ============================================================================
-- TESDH Community Hub - Chat System & Messaging Persistence Repair
-- Migration: 20261023190000_tesdh_chat_system_repair.sql
-- Features: 
--   1. Schema extensions for conversations (status, last_message, unread_count)
--   2. Schema extensions for messages (image_url, is_anonymous, sender_name)
--   3. Explicit RLS policies allowing authenticated participants to INSERT and UPDATE conversations
--   4. Atomic send_or_create_conversation stored procedure guaranteeing first-message persistence
-- ============================================================================

-- 1. EXTEND CONVERSATIONS TABLE
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted',
ADD COLUMN IF NOT EXISTS last_message TEXT,
ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_conversations_participants 
ON public.conversations(participant_one, participant_two);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time 
ON public.conversations(last_message_time DESC);

-- 2. EXTEND MESSAGES TABLE
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sender_name TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
ON public.messages(conversation_id, created_at ASC);

-- 3. ENSURE RLS POLICIES FOR CONVERSATIONS
DROP POLICY IF EXISTS "Users can see conversations they participate in" ON public.conversations;
CREATE POLICY "Users can see conversations they participate in"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

DROP POLICY IF EXISTS "Users can create conversations they participate in" ON public.conversations;
CREATE POLICY "Users can create conversations they participate in"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = participant_one OR auth.uid() = participant_two)
  AND participant_one <> participant_two
);

DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;
CREATE POLICY "Users can update conversations they participate in"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = participant_one OR auth.uid() = participant_two)
WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- 4. ENSURE RLS POLICIES FOR MESSAGES
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can send messages to conversations they belong to" ON public.messages;
CREATE POLICY "Users can send messages to conversations they belong to"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

-- 5. ATOMIC RPC FUNCTION TO SEND INITIAL MESSAGE OR CREATE CONVERSATION
-- Ensures first messages never disappear even across rapid clicks or navigation
CREATE OR REPLACE FUNCTION public.send_or_create_conversation(
  p_recipient_id UUID,
  p_subject TEXT DEFAULT 'Direct Message',
  p_initial_message TEXT DEFAULT '',
  p_context_type TEXT DEFAULT 'general',
  p_is_anonymous BOOLEAN DEFAULT FALSE,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_sender_name TEXT;
  v_conv_id UUID;
  v_msg_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to start conversation.';
  END IF;

  IF v_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Residents cannot message themselves.';
  END IF;

  -- Look up sender profile display name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_sender_id;

  -- Look for existing conversation between the two participants
  SELECT id INTO v_conv_id 
  FROM public.conversations 
  WHERE (participant_one = v_sender_id AND participant_two = p_recipient_id)
     OR (participant_one = p_recipient_id AND participant_two = v_sender_id)
  LIMIT 1;

  -- Create conversation if none exists
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (
      participant_one,
      participant_two,
      subject,
      context_type,
      status,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      v_sender_id,
      p_recipient_id,
      COALESCE(p_subject, 'Direct Message'),
      COALESCE(p_context_type, 'general'),
      'accepted',
      COALESCE(p_initial_message, ''),
      v_now,
      v_now,
      v_now
    )
    RETURNING id INTO v_conv_id;
  END IF;

  -- If an initial message was supplied, atomically insert it
  IF p_initial_message IS NOT NULL AND TRIM(p_initial_message) != '' THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      content,
      image_url,
      is_anonymous,
      sender_name,
      is_read,
      created_at
    ) VALUES (
      v_conv_id,
      v_sender_id,
      TRIM(p_initial_message),
      p_image_url,
      p_is_anonymous,
      CASE WHEN p_is_anonymous THEN 'Anonymous Neighbour' ELSE COALESCE(v_sender_name, 'Resident') END,
      FALSE,
      v_now
    )
    RETURNING id INTO v_msg_id;

    -- Update last message preview on the conversation
    UPDATE public.conversations
    SET 
      last_message = TRIM(p_initial_message),
      last_message_time = v_now,
      updated_at = v_now
    WHERE id = v_conv_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'conversation_id', v_conv_id,
    'message_id', v_msg_id,
    'created_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
