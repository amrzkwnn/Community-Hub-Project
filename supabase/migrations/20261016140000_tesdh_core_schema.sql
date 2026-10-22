-- ============================================================================
-- TESDH Community Hub - Supabase Core Schema Migration
-- Migration: 20261016140000_tesdh_core_schema.sql
-- Tables: profiles, announcements, community_posts, comments,
--         service_listings, exchange_listings, community_reports
-- ============================================================================

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'moderator', 'management', 'security')),
    township_precinct TEXT NOT NULL DEFAULT 'Bandar Elmina',
    unit_number TEXT,                      -- CONFIDENTIAL: Masked from public
    phone TEXT,                            -- CONFIDENTIAL: Masked from public
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    verification_doc_url TEXT,            -- Tenancy / S&P document proof
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_precinct ON public.profiles(township_precinct);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles(verification_status);

-- Safe public view of profiles omitting unit_number and phone
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

-- ============================================================================
-- 2. ANNOUNCEMENTS TABLE (Official Broadcasts by Management & Security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);

-- ============================================================================
-- 3. COMMUNITY POSTS TABLE (Feed Discussions, Complaints, Events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('discussion', 'event', 'complaint', 'general')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE, -- Masks identity from neighbours
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'hidden', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON public.community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);

-- ============================================================================
-- 4. COMMENTS TABLE (Replies on Community Posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_official_response BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at ASC);

-- ============================================================================
-- 5. SERVICE LISTINGS TABLE (Gigs, Tutoring, Carpool, Babysitting, Repairs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('offering', 'requesting')),
    category TEXT NOT NULL CHECK (category IN ('home_services', 'childcare', 'pet_care', 'tutoring', 'carpool', 'gardening', 'tech_help', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price_estimate TEXT,
    precinct TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'flagged')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_listings_type ON public.service_listings(type);
CREATE INDEX IF NOT EXISTS idx_service_listings_category ON public.service_listings(category);
CREATE INDEX IF NOT EXISTS idx_service_listings_status ON public.service_listings(status);

-- ============================================================================
-- 6. EXCHANGE LISTINGS TABLE (Circular Economy, Barter, Free Giveaway, Tool Loan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exchange_listings (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_listings_type ON public.exchange_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_status ON public.exchange_listings(status);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_category ON public.exchange_listings(category);

-- ============================================================================
-- 7. COMMUNITY REPORTS TABLE (Resilience Incidents, Floods, Infrastructure & Misconduct)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('flood', 'blocked_drain', 'fallen_tree', 'pothole', 'street_light', 'water_disruption', 'misconduct', 'spam', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_name TEXT,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'dispatched', 'resolved', 'dismissed')),
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    management_notes TEXT,
    assigned_team TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_type ON public.community_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON public.community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_severity ON public.community_reports(severity);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER FOR AUTH.USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    display_name, 
    role, 
    township_precinct, 
    verification_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Penduduk Baru'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident'),
    COALESCE(NEW.raw_user_meta_data->>'township_precinct', 'Bandar Elmina'),
    'unverified'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Helper function: Check caller role without circular RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: Check if caller is verified
CREATE OR REPLACE FUNCTION public.is_resident_verified()
RETURNS BOOLEAN AS $$
  SELECT verification_status = 'verified' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
-- Public profile attributes visible to authenticated users
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- User can update their own editable profile fields
CREATE POLICY "Users can update own basic profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Cannot self-grant elevated role or verified status
  role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
  verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
);

-- Management can update verification status and role
CREATE POLICY "Management can update resident verification and role"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_auth_role() = 'management')
WITH CHECK (public.get_auth_role() = 'management');

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Published announcements readable by authenticated"
ON public.announcements FOR SELECT
TO authenticated
USING (status = 'published' OR public.get_auth_role() IN ('management', 'security'));

CREATE POLICY "Management and security can insert announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (public.get_auth_role() IN ('management', 'security') AND auth.uid() = author_id);

CREATE POLICY "Management and security can update announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (public.get_auth_role() IN ('management', 'security'));

-- ----------------------------------------------------------------------------
-- COMMUNITY POSTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Active posts readable by authenticated users"
ON public.community_posts FOR SELECT
TO authenticated
USING (
  status = 'active' OR 
  author_id = auth.uid() OR 
  public.get_auth_role() IN ('management', 'moderator')
);

CREATE POLICY "Verified residents and staff can create posts"
ON public.community_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  (public.is_resident_verified() OR public.get_auth_role() IN ('management', 'moderator', 'security'))
);

CREATE POLICY "Author can update own posts"
ON public.community_posts FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

CREATE POLICY "Author can delete own posts"
ON public.community_posts FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- ----------------------------------------------------------------------------
-- COMMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Comments readable by authenticated"
ON public.comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Verified residents and staff can post comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  (public.is_resident_verified() OR public.get_auth_role() IN ('management', 'moderator', 'security'))
);

CREATE POLICY "Author and moderators can delete comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- ----------------------------------------------------------------------------
-- SERVICE LISTINGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Service listings readable by authenticated"
ON public.service_listings FOR SELECT
TO authenticated
USING (status = 'active' OR author_id = auth.uid() OR public.get_auth_role() IN ('management', 'moderator'));

CREATE POLICY "Verified residents can create service listings"
ON public.service_listings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  (public.is_resident_verified() OR public.get_auth_role() IN ('management', 'moderator'))
);

CREATE POLICY "Author can update own service listing"
ON public.service_listings FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR public.get_auth_role() IN ('management', 'moderator'));

-- ----------------------------------------------------------------------------
-- EXCHANGE LISTINGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Exchange listings readable by authenticated"
ON public.exchange_listings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Verified residents can create exchange listings"
ON public.exchange_listings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND
  (public.is_resident_verified() OR public.get_auth_role() IN ('management', 'moderator'))
);

CREATE POLICY "Author or reserver can update exchange listings"
ON public.exchange_listings FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  auth.uid() = reserved_by_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- ----------------------------------------------------------------------------
-- COMMUNITY REPORTS POLICIES
-- ----------------------------------------------------------------------------
-- Public reports or reports created by the user or staff
CREATE POLICY "Reports readable by authenticated"
ON public.community_reports FOR SELECT
TO authenticated
USING (
  -- Reports that are non-misconduct (resilience, flood, tree, etc) are visible to township
  (report_type NOT IN ('misconduct', 'spam')) OR
  (reporter_id = auth.uid()) OR
  (public.get_auth_role() IN ('management', 'security', 'moderator'))
);

CREATE POLICY "Authenticated users can submit reports"
ON public.community_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Management and security can update report status"
ON public.community_reports FOR UPDATE
TO authenticated
USING (
  reporter_id = auth.uid() OR
  public.get_auth_role() IN ('management', 'security', 'moderator')
);
