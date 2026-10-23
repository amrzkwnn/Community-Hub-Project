-- ============================================================================
-- NADIKOMUNITI - Resident Address Registration & JMB Approval System
-- Migration: 20261023230000_tesdh_address_verification_system.sql
-- ============================================================================

-- 1. RESIDENT ADDRESS REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.resident_address_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    precinct TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    street_name TEXT,
    residence_type TEXT NOT NULL DEFAULT 'owner' CHECK (residence_type IN ('owner', 'tenant', 'household_member')),
    proof_doc_url TEXT,
    proof_doc_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'revoked')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying & search
CREATE INDEX IF NOT EXISTS idx_addr_reg_user ON public.resident_address_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_addr_reg_status ON public.resident_address_registrations(status);
CREATE INDEX IF NOT EXISTS idx_addr_reg_precinct ON public.resident_address_registrations(precinct);
CREATE INDEX IF NOT EXISTS idx_addr_reg_unit ON public.resident_address_registrations(unit_number);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.resident_address_registrations ENABLE ROW LEVEL SECURITY;

-- Policy A: Residents can view their own address registrations
DROP POLICY IF EXISTS "Residents can view their own address registrations" ON public.resident_address_registrations;
CREATE POLICY "Residents can view their own address registrations"
ON public.resident_address_registrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy B: Management / JMB can view all address registrations
DROP POLICY IF EXISTS "Management can view all address registrations" ON public.resident_address_registrations;
CREATE POLICY "Management can view all address registrations"
ON public.resident_address_registrations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('management', 'moderator')
  )
);

-- Policy C: Authenticated residents can view ONLY verified addresses for secure contact discovery
DROP POLICY IF EXISTS "Authenticated residents can search verified addresses" ON public.resident_address_registrations;
CREATE POLICY "Authenticated residents can search verified addresses"
ON public.resident_address_registrations FOR SELECT
TO authenticated
USING (status = 'verified');

-- Policy D: Residents can insert their own address registrations
DROP POLICY IF EXISTS "Residents can submit address registrations" ON public.resident_address_registrations;
CREATE POLICY "Residents can submit address registrations"
ON public.resident_address_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy E: Residents can update their pending or rejected registrations
DROP POLICY IF EXISTS "Residents can update pending or rejected registrations" ON public.resident_address_registrations;
CREATE POLICY "Residents can update pending or rejected registrations"
ON public.resident_address_registrations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Policy F: Management can update registration status (approve, reject, revoke)
DROP POLICY IF EXISTS "Management can review address registrations" ON public.resident_address_registrations;
CREATE POLICY "Management can review address registrations"
ON public.resident_address_registrations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'management'
  )
);
