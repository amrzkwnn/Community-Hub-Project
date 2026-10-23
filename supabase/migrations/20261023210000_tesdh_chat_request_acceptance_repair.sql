-- ============================================================================
-- NADIKOMUNITI - Message Request Acceptance & Shared Two-Way Conversation Repair
-- Migration: 20261023210000_tesdh_chat_request_acceptance_repair.sql
-- Features:
--   1. Ensures public.property_message_requests exists with full RLS policies
--   2. Atomic accept_message_request RPC resolving canonical conversation & initial message
--   3. Guarantees both sender and recipient can query and participate in accepted conversations
--   4. Idempotent execution preventing duplicate conversations or duplicate initial messages
-- ============================================================================

-- 1. ENSURE PROPERTY_MESSAGE_REQUESTS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.property_message_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    initial_message TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    sender_display_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_requests_recipient ON public.property_message_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_requests_sender ON public.property_message_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_requests_status ON public.property_message_requests(status);
CREATE INDEX IF NOT EXISTS idx_msg_requests_conversation ON public.property_message_requests(conversation_id);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.property_message_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view message requests" ON public.property_message_requests;
CREATE POLICY "Participants can view message requests"
ON public.property_message_requests FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Verified residents can send message requests" ON public.property_message_requests;
CREATE POLICY "Verified residents can send message requests"
ON public.property_message_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

DROP POLICY IF EXISTS "Recipients can update request status" ON public.property_message_requests;
CREATE POLICY "Recipients can update request status"
ON public.property_message_requests FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- 3. ATOMIC STORED PROCEDURE: accept_message_request
-- Atomically accepts the pending request, creates or links the canonical conversation,
-- persists the opening message, and ensures BOTH participants can discover the conversation.
CREATE OR REPLACE FUNCTION public.accept_message_request(
  p_request_id UUID,
  p_recipient_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  v_req RECORD;
  v_conv_id UUID;
  v_conv RECORD;
  v_msg_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_sender_name TEXT;
  v_recipient_name TEXT;
BEGIN
  -- 1. Validate request existence
  SELECT * INTO v_req
  FROM public.property_message_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message request not found.';
  END IF;

  -- 2. Validate authorized recipient
  IF v_req.recipient_id <> p_recipient_id THEN
    RAISE EXCEPTION 'Unauthorized: only the intended recipient can accept this message request.';
  END IF;

  -- 3. Check if already accepted and has conversation
  IF v_req.status = 'accepted' AND v_req.conversation_id IS NOT NULL THEN
    SELECT * INTO v_conv FROM public.conversations WHERE id = v_req.conversation_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'conversation_id', v_conv.id,
        'status', 'already_accepted',
        'subject', v_conv.subject
      );
    END IF;
  END IF;

  -- 4. Get participant display names
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_req.sender_id;
  SELECT full_name INTO v_recipient_name FROM public.profiles WHERE id = v_req.recipient_id;

  IF v_req.is_anonymous THEN
    v_sender_name := 'Elmina Neighbour (Anonymous)';
  ELSE
    v_sender_name := COALESCE(v_req.sender_display_name, v_sender_name, 'Resident');
  END IF;

  -- 5. Find existing canonical conversation between these two users or create a new one
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE (participant_one = v_req.sender_id AND participant_two = v_req.recipient_id)
     OR (participant_one = v_req.recipient_id AND participant_two = v_req.sender_id)
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    -- Create new canonical conversation
    INSERT INTO public.conversations (
      participant_one,
      participant_two,
      subject,
      context_type,
      status,
      last_message,
      last_message_time,
      unread_count
    ) VALUES (
      v_req.sender_id,
      v_req.recipient_id,
      v_req.subject,
      'property_messaging',
      'accepted',
      v_req.initial_message,
      v_now,
      0
    )
    RETURNING id INTO v_conv_id;
  ELSE
    -- Activate existing conversation
    UPDATE public.conversations
    SET 
      status = 'accepted',
      last_message = COALESCE(v_req.initial_message, last_message),
      last_message_time = v_now
    WHERE id = v_conv_id;
  END IF;

  -- 6. Insert initial message if not already present in this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.messages 
    WHERE conversation_id = v_conv_id 
      AND sender_id = v_req.sender_id 
      AND content = v_req.initial_message
  ) THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      content,
      is_anonymous,
      sender_name,
      created_at
    ) VALUES (
      v_conv_id,
      v_req.sender_id,
      v_req.initial_message,
      v_req.is_anonymous,
      v_sender_name,
      v_req.created_at
    )
    RETURNING id INTO v_msg_id;
  END IF;

  -- 7. Update property_message_requests status & link conversation
  UPDATE public.property_message_requests
  SET 
    status = 'accepted',
    conversation_id = v_conv_id,
    updated_at = v_now
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conv_id,
    'message_id', v_msg_id,
    'sender_id', v_req.sender_id,
    'recipient_id', v_req.recipient_id,
    'subject', v_req.subject,
    'initial_message', v_req.initial_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
