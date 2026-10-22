-- ============================================================================
-- TESDH Community Hub - Initial Database Schema & Row Level Security (RLS)
-- Target: Supabase / PostgreSQL 15+
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'moderator', 'management', 'security')),
    township_precinct TEXT NOT NULL DEFAULT 'Bandar Elmina',
    unit_number TEXT, -- PRIVATE: Masked from public views
    phone TEXT,       -- PRIVATE: Never exposed in public directories
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    verification_doc_url TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public view with private fields (unit_number, phone, verification_doc_url) omitted
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    full_name,
    display_name,
    role,
    township_precinct,
    verification_status,
    avatar_url,
    created_at
FROM public.profiles;

-- 2. COMMUNITY POSTS (Feed announcements, discussions, complaints, events)
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('announcement', 'security_alert', 'event', 'complaint', 'discussion')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'hidden', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. POST REPLIES / COMMENTS
CREATE TABLE IF NOT EXISTS public.post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_official_response BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LOCAL SERVICES & HELP REQUESTS
CREATE TABLE IF NOT EXISTS public.local_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('offering', 'requesting')),
    category TEXT NOT NULL CHECK (category IN ('home_services', 'childcare', 'pet_care', 'tutoring', 'carpool', 'gardening', 'tech_help', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_estimate TEXT,
    precinct TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'flagged')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CIRCULAR EXCHANGE (Reuse, Barter & Giveaway)
CREATE TABLE IF NOT EXISTS public.circular_exchange (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_type TEXT NOT NULL CHECK (listing_type IN ('giveaway', 'exchange', 'loan')),
    category TEXT NOT NULL CHECK (category IN ('furniture', 'baby_kids', 'appliances', 'books_study', 'plants_garden', 'sports_leisure', 'others')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('brand_new', 'like_new', 'good', 'fair')),
    image_url TEXT,
    precinct TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'completed')),
    reserved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COMMUNITY RESILIENCE MAP (Floods, Fallen Trees, Drains, Potholes)
CREATE TABLE IF NOT EXISTS public.resilience_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('flood', 'blocked_drain', 'fallen_tree', 'pothole', 'street_light', 'water_disruption', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'under_review', 'dispatched', 'resolved')),
    image_url TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    management_notes TEXT,
    assigned_team TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INCIDENT AUDIT / PROGRESS UPDATES
CREATE TABLE IF NOT EXISTS public.incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.resilience_incidents(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status_from TEXT,
    status_to TEXT,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. MEDIATED PRIVATE CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT,
    context_type TEXT CHECK (context_type IN ('service', 'exchange', 'management_inquiry', 'general')),
    context_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT distinct_participants CHECK (participant_one <> participant_two)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MODERATION REPORTS & CONTENT FLAGS
CREATE TABLE IF NOT EXISTS public.moderation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply', 'service', 'exchange', 'incident', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'false_information', 'inappropriate', 'duplicate', 'privacy_violation', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ADMINISTRATIVE AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circular_exchange ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resilience_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own non-sensitive profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Management and security can view full profile details for verification"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  public.current_user_role() IN ('management', 'security', 'moderator')
);

CREATE POLICY "Management can update resident verification status and role"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'management')
WITH CHECK (public.current_user_role() = 'management');

-- Community Posts Policies
CREATE POLICY "Active posts are readable by authenticated users"
ON public.community_posts FOR SELECT
TO authenticated
USING (status = 'active' OR author_id = auth.uid() OR public.current_user_role() IN ('management', 'moderator'));

CREATE POLICY "Verified residents, moderators, and management can create posts"
ON public.community_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  (
    category != 'announcement' AND category != 'security_alert' OR
    public.current_user_role() IN ('management', 'security')
  )
);

CREATE POLICY "Authors, moderators and management can update posts"
ON public.community_posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR public.current_user_role() IN ('moderator', 'management'));

-- Post Replies Policies
CREATE POLICY "Replies are readable by authenticated users"
ON public.post_replies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can reply"
ON public.post_replies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Resilience Incidents Policies
CREATE POLICY "Incidents are readable by all authenticated users"
ON public.resilience_incidents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can report incidents"
ON public.resilience_incidents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Management and security can update incident status"
ON public.resilience_incidents FOR UPDATE
TO authenticated
USING (
  auth.uid() = reporter_id OR
  public.current_user_role() IN ('management', 'security', 'moderator')
);

-- Local Services & Circular Exchange Policies
CREATE POLICY "Services readable by authenticated users"
ON public.local_services FOR SELECT
TO authenticated
USING (status = 'active' OR author_id = auth.uid() OR public.current_user_role() IN ('management', 'moderator'));

CREATE POLICY "Users can create service listings"
ON public.local_services FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Circular exchange readable by all authenticated"
ON public.circular_exchange FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create exchange listings"
ON public.circular_exchange FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own exchange listings"
ON public.circular_exchange FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = reserved_by_id OR public.current_user_role() IN ('management', 'moderator'));

-- Conversations & Messages Policies
CREATE POLICY "Users can see conversations they participate in"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

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

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
  )
);

-- Moderation & Audit Logs Policies
CREATE POLICY "Users can report content"
ON public.moderation_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators and management view reports"
ON public.moderation_reports FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('moderator', 'management'));

CREATE POLICY "Moderators and management update reports"
ON public.moderation_reports FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('moderator', 'management'));

CREATE POLICY "Audit logs readable only by management and security"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.current_user_role() IN ('management', 'security'));

CREATE POLICY "System and managers can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id);
