-- ============================================================================
-- TESDH Community Hub - Version 2 Features Migration
-- Migration: 20261016150000_tesdh_v2_features.sql
-- Features: Verified Incident Alerts, Property Messaging, Notification Centre,
--           Strict Role Elevation Guards & Audit Logging
-- ============================================================================

-- 1. ADD VERIFICATION FIELDS TO COMMUNITY REPORTS
ALTER TABLE public.community_reports 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_community_reports_verified ON public.community_reports(is_verified);

-- 2. CREATE PROPERTY MESSAGE REQUESTS TABLE
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
    conversation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_requests_recipient ON public.property_message_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_msg_requests_sender ON public.property_message_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_msg_requests_status ON public.property_message_requests(status);

-- 3. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN (
      'official_announcement', 
      'verified_incident_alert', 
      'incident_status_update', 
      'message_request', 
      'message_reply', 
      'verification_status_update'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
    target_tab TEXT, -- 'feed', 'resilience', 'messages', 'management'
    target_id TEXT,  -- ID of post, incident, conversation
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- 4. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.property_message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark own notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users or system can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users or system can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. RLS POLICIES FOR PROPERTY MESSAGE REQUESTS
DROP POLICY IF EXISTS "Participants can view message requests" ON public.property_message_requests;
CREATE POLICY "Participants can view message requests"
ON public.property_message_requests FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Verified residents can send message requests" ON public.property_message_requests;
CREATE POLICY "Verified residents can send message requests"
ON public.property_message_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  sender_id != recipient_id AND
  (public.is_resident_verified() OR public.get_auth_role() IN ('management', 'security'))
);

DROP POLICY IF EXISTS "Recipients can update request status" ON public.property_message_requests;
CREATE POLICY "Recipients can update request status"
ON public.property_message_requests FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid() OR sender_id = auth.uid())
WITH CHECK (recipient_id = auth.uid() OR sender_id = auth.uid());

-- 8. RLS POLICIES FOR AUDIT LOGS
DROP POLICY IF EXISTS "Management can view audit logs" ON public.audit_logs;
CREATE POLICY "Management can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('management', 'security'));

DROP POLICY IF EXISTS "Authenticated staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated staff can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.get_auth_role() IN ('management', 'security', 'moderator'));

-- 9. STORED PROCEDURE: VERIFY COMMUNITY REPORT (STRICTLY MANAGEMENT ONLY)
CREATE OR REPLACE FUNCTION public.verify_community_report(
  p_report_id UUID,
  p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_report public.community_reports%ROWTYPE;
BEGIN
  -- Verify caller is management
  SELECT role, full_name INTO v_actor_role, v_actor_name 
  FROM public.profiles 
  WHERE id = v_actor_id;

  IF v_actor_role != 'management' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pegawai pengurusan dibenarkan mengesahkan insiden.';
  END IF;

  -- Update report
  UPDATE public.community_reports
  SET 
    is_verified = TRUE,
    verified_by = v_actor_id,
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_report_id
  RETURNING * INTO v_report;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Laporan insiden tidak dijumpai.';
  END IF;

  -- Log to audit trail
  INSERT INTO public.audit_logs (
    actor_id,
    actor_name,
    actor_role,
    action,
    target_type,
    target_id,
    details
  )
  VALUES (
    v_actor_id,
    v_actor_name,
    v_actor_role,
    'VERIFY_INCIDENT',
    'community_report',
    p_report_id::TEXT,
    jsonb_build_object('title', v_report.title, 'notes', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'report_id', p_report_id, 
    'verified_by', v_actor_name, 
    'verified_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. STORED PROCEDURE: SEARCH PROPERTY FOR MESSAGING (PREVENTS ENUMERATION & LEAKS)
CREATE OR REPLACE FUNCTION public.search_property_for_messaging(
  p_query TEXT
)
RETURNS TABLE (
  target_id UUID,
  precinct TEXT,
  masked_property TEXT
) AS $$
DECLARE
  v_clean_query TEXT := trim(p_query);
BEGIN
  -- Prevent trivial or broad enumeration queries
  IF length(v_clean_query) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS target_id,
    p.township_precinct AS precinct,
    -- Return property location without exposing resident real name or phone
    COALESCE(p.unit_number, 'Kediaman Elmina') AS masked_property
  FROM public.profiles p
  WHERE 
    p.id != auth.uid()
    AND p.verification_status = 'verified'
    AND (
      p.unit_number ILIKE '%' || v_clean_query || '%' OR
      p.township_precinct ILIKE '%' || v_clean_query || '%'
    )
  LIMIT 8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
