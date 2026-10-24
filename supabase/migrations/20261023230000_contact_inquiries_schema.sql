-- ============================================================================
-- MIGRATION: 20261023230000_contact_inquiries_schema.sql
-- NadiKomuniti Township Contact Inquiries & Public Inquiries Schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'maintenance', 'security', 'billing')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying and reference lookup
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_reference_id ON public.contact_inquiries(reference_id);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON public.contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_category ON public.contact_inquiries(category);

-- Enable Row Level Security
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 1. Public & resident submission (anyone can submit an inquiry)
CREATE POLICY "Public and residents can submit contact inquiries"
ON public.contact_inquiries
FOR INSERT
WITH CHECK (true);

-- 2. Management staff can view all inquiries
CREATE POLICY "Management officers can view all contact inquiries"
ON public.contact_inquiries
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'management'
    )
);

-- 3. Individual registered residents can view their own inquiries
CREATE POLICY "Registered users can view their own contact inquiries"
ON public.contact_inquiries
FOR SELECT
USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- 4. Management staff can update status and notes
CREATE POLICY "Management officers can update contact inquiries"
ON public.contact_inquiries
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'management'
    )
);
