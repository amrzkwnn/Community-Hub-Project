-- ============================================================================
-- TESDH Community Hub - Incident Archiving & Supabase Storage Policies
-- Migration: 20261016170000_tesdh_incident_archive_and_storage.sql
-- Features: Resolved Incident Archiving, Incident History Auditability,
--           Supabase Storage Buckets & Access-Controlled Policies
-- ============================================================================

-- 1. ADD ARCHIVING FIELDS TO COMMUNITY REPORTS
ALTER TABLE public.community_reports
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_community_reports_archived 
ON public.community_reports(is_archived, status);

CREATE INDEX IF NOT EXISTS idx_community_reports_archived_at 
ON public.community_reports(archived_at);

-- Add image support to exchange listings, service listings, and messages if missing
ALTER TABLE public.exchange_listings
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

ALTER TABLE public.service_listings
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. UPDATE RLS POLICIES FOR COMMUNITY REPORTS
-- Regular users see active (unarchived) reports or their own reports.
-- Management officers see all reports including archived historical records.
DROP POLICY IF EXISTS "Active and accessible reports readable" ON public.community_reports;
DROP POLICY IF EXISTS "Public reports are readable" ON public.community_reports;
DROP POLICY IF EXISTS "Community reports are viewable by everyone" ON public.community_reports;

CREATE POLICY "Active and accessible reports readable"
ON public.community_reports FOR SELECT
TO authenticated
USING (
  (is_archived = FALSE) OR 
  (reporter_id = auth.uid()) OR 
  (public.get_auth_role() IN ('management', 'moderator', 'security'))
);

-- Management can update reports (status, archiving, verification)
DROP POLICY IF EXISTS "Management and authors can update reports" ON public.community_reports;
CREATE POLICY "Management and authors can update reports"
ON public.community_reports FOR UPDATE
TO authenticated
USING (
  reporter_id = auth.uid() OR 
  public.get_auth_role() IN ('management', 'moderator', 'security')
)
WITH CHECK (
  reporter_id = auth.uid() OR 
  public.get_auth_role() IN ('management', 'moderator', 'security')
);

-- 3. STORED PROCEDURE: ARCHIVE RESOLVED INCIDENT
-- Only management may archive an incident, and it must be resolved.
CREATE OR REPLACE FUNCTION public.archive_resolved_incident(
  p_incident_id UUID
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

  -- Verify management authority
  IF v_actor_role != 'management' THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized management officers can archive incidents.';
  END IF;

  SELECT * INTO v_incident 
  FROM public.community_reports WHERE id = p_incident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident report not found.';
  END IF;

  -- Must be resolved before archiving
  IF v_incident.status != 'resolved' THEN
    RAISE EXCEPTION 'Cannot archive unresolved incident. The incident status must be resolved first.';
  END IF;

  -- Soft delete / archive
  UPDATE public.community_reports
  SET 
    is_archived = TRUE,
    archived_at = NOW(),
    archived_by = v_actor_id,
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- Record in audit trail
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, target_type, target_id, details
  )
  VALUES (
    v_actor_id, v_actor_name, v_actor_role,
    'ARCHIVE_INCIDENT',
    'community_reports',
    p_incident_id::TEXT,
    jsonb_build_object(
      'title', v_incident.title,
      'location', v_incident.location_name,
      'severity', v_incident.severity,
      'resolved_at', v_incident.resolved_at,
      'archived_at', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'archived_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SUPABASE STORAGE BUCKETS & SECURITY POLICIES
-- Create storage schema if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'community-media', 
    'community-media', 
    true, 
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'secure-message-attachments', 
    'secure-message-attachments', 
    false, -- Private bucket
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies for 'community-media' (Public community attachments)
DROP POLICY IF EXISTS "Public community media viewable" ON storage.objects;
CREATE POLICY "Public community media viewable"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "Authenticated users can upload community media" ON storage.objects;
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-media' AND
  (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

DROP POLICY IF EXISTS "Owners and management can delete community media" ON storage.objects;
CREATE POLICY "Owners and management can delete community media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-media' AND (
    owner = auth.uid() OR
    public.get_auth_role() IN ('management', 'moderator')
  )
);

-- Storage Policies for 'secure-message-attachments' (Private mediated messaging)
-- Strict access control: only participants of the message/conversation or management
DROP POLICY IF EXISTS "Participants can view secure message attachments" ON storage.objects;
CREATE POLICY "Participants can view secure message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'secure-message-attachments' AND (
    owner = auth.uid() OR
    public.get_auth_role() = 'management'
  )
);

DROP POLICY IF EXISTS "Authenticated users can upload secure message attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload secure message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'secure-message-attachments' AND
  (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

DROP POLICY IF EXISTS "Owners can delete own message attachments" ON storage.objects;
CREATE POLICY "Owners can delete own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'secure-message-attachments' AND (
    owner = auth.uid() OR
    public.get_auth_role() = 'management'
  )
);
