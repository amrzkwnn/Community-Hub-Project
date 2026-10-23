-- ============================================================================
-- TESDH Community Hub - Incident Approval Workflow & Strict RLS Hardening
-- Migration: 20261023180000_tesdh_incident_approval_and_rls.sql
-- Features: 
--   1. Strict RLS hiding unapproved ('pending') and 'rejected' reports from public/residents
--   2. Reporter access preserved for their own submissions
--   3. Management officers verified access to Pending Approval queue
--   4. Residents prevented from approving or escalating their own reports
--   5. Approval/Rejection stored procedures with tamper-evident audit logging
-- ============================================================================

-- 1. DROP EXISTING RELAXED POLICIES ON COMMUNITY REPORTS
DROP POLICY IF EXISTS "Active and accessible reports readable" ON public.community_reports;
DROP POLICY IF EXISTS "Public reports are readable" ON public.community_reports;
DROP POLICY IF EXISTS "Community reports are viewable by everyone" ON public.community_reports;
DROP POLICY IF EXISTS "Management and authors can update reports" ON public.community_reports;

-- 2. CREATE STRICT SELECT POLICY FOR COMMUNITY REPORTS
-- - Approved reports (status NOT IN ('pending', 'rejected', 'dismissed') AND is_archived = FALSE) are visible to all authenticated users.
-- - Reporters can always see their own reports regardless of status (pending, rejected, approved).
-- - Management, moderator, and security officers can view ALL reports (including pending and rejected).
CREATE POLICY "Strict approved or owned or management reports readable"
ON public.community_reports FOR SELECT
TO authenticated
USING (
  -- Approved and active public reports
  (
    is_archived = FALSE 
    AND status NOT IN ('pending', 'rejected', 'dismissed')
    AND is_merged = FALSE
  )
  OR
  -- Reporter may view their own submitted reports
  (reporter_id = auth.uid())
  OR
  -- Management, moderator, and security personnel
  (public.get_auth_role() IN ('management', 'moderator', 'security'))
);

-- Also allow anonymous public read ONLY for approved, non-archived reports (if public access is permitted)
DROP POLICY IF EXISTS "Public anonymous reports readable" ON public.community_reports;
CREATE POLICY "Public anonymous reports readable"
ON public.community_reports FOR SELECT
TO anon
USING (
  is_archived = FALSE 
  AND status NOT IN ('pending', 'rejected', 'dismissed')
  AND is_merged = FALSE
);

-- 3. CREATE STRICT INSERT POLICY FOR RESIDENTS
-- Residents can submit reports with default status 'pending'
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.community_reports;
CREATE POLICY "Authenticated users can submit reports"
ON public.community_reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND reporter_id = auth.uid()
  AND (
    -- Residents MUST submit with status 'pending'
    (public.get_auth_role() NOT IN ('management', 'moderator', 'security') AND status = 'pending')
    OR
    -- Management can submit directly
    (public.get_auth_role() IN ('management', 'moderator', 'security'))
  )
);

-- 4. CREATE STRICT UPDATE POLICY PREVENTING SELF-APPROVAL
-- Regular residents CANNOT update status to approved/under_review/resolved.
-- Only management, moderator, and security can modify status or approve.
CREATE POLICY "Strict management-only status updates"
ON public.community_reports FOR UPDATE
TO authenticated
USING (
  public.get_auth_role() IN ('management', 'moderator', 'security')
  OR
  (
    reporter_id = auth.uid() 
    AND status = 'pending'
  )
)
WITH CHECK (
  public.get_auth_role() IN ('management', 'moderator', 'security')
  OR
  (
    reporter_id = auth.uid() 
    AND status = 'pending' -- Reporter cannot alter status out of pending
  )
);

-- 5. MANAGEMENT APPROVE INCIDENT STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.approve_incident_report(
  p_incident_id UUID,
  p_initial_status TEXT DEFAULT 'under_review',
  p_assigned_team TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_incident public.community_reports%ROWTYPE;
BEGIN
  SELECT role, full_name INTO v_actor_role, v_actor_name 
  FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('management', 'moderator', 'security') THEN
    RAISE EXCEPTION 'Unauthorized: Only management or security officers can approve incidents.';
  END IF;

  SELECT * INTO v_incident 
  FROM public.community_reports WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident report not found.';
  END IF;

  UPDATE public.community_reports
  SET 
    status = COALESCE(p_initial_status, 'under_review'),
    assigned_team = COALESCE(p_assigned_team, v_incident.assigned_team),
    management_notes = CASE 
      WHEN p_notes IS NOT NULL THEN CONCAT(COALESCE(management_notes, ''), E'\n[Approved by ', v_actor_name, ']: ', p_notes)
      ELSE management_notes
    END,
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- Record in audit log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    v_actor_id,
    'incident_approved',
    'community_reports',
    p_incident_id,
    jsonb_build_object(
      'previous_status', v_incident.status,
      'new_status', COALESCE(p_initial_status, 'under_review'),
      'approved_by_role', v_actor_role,
      'approved_by_name', v_actor_name
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'incident_id', p_incident_id,
    'status', COALESCE(p_initial_status, 'under_review')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. MANAGEMENT REJECT INCIDENT STORED PROCEDURE
CREATE OR REPLACE FUNCTION public.reject_incident_report(
  p_incident_id UUID,
  p_reason TEXT DEFAULT 'Does not meet incident threshold'
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_incident public.community_reports%ROWTYPE;
BEGIN
  SELECT role, full_name INTO v_actor_role, v_actor_name 
  FROM public.profiles WHERE id = v_actor_id;

  IF v_actor_role NOT IN ('management', 'moderator', 'security') THEN
    RAISE EXCEPTION 'Unauthorized: Only management or security officers can reject incidents.';
  END IF;

  SELECT * INTO v_incident 
  FROM public.community_reports WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident report not found.';
  END IF;

  UPDATE public.community_reports
  SET 
    status = 'rejected',
    management_notes = CONCAT(COALESCE(management_notes, ''), E'\n[Rejected by ', v_actor_name, ']: ', p_reason),
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- Record in audit log
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) VALUES (
    v_actor_id,
    'incident_rejected',
    'community_reports',
    p_incident_id,
    jsonb_build_object(
      'previous_status', v_incident.status,
      'reason', p_reason,
      'rejected_by_role', v_actor_role,
      'rejected_by_name', v_actor_name
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'incident_id', p_incident_id,
    'status', 'rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_community_reports_status_archived 
ON public.community_reports(status, is_archived);

CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_status 
ON public.community_reports(reporter_id, status);
