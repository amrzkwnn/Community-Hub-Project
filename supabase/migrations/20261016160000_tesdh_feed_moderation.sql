-- ============================================================================
-- TESDH Community Hub - Community Feed Moderation & Content Management
-- Migration: 20261016160000_tesdh_feed_moderation.sql
-- Features: Post & Comment Editing, Owner Deletion, Management Moderation,
--           Soft Deletion & Tamper-Proof Audit Logging
-- ============================================================================

-- 1. ADD AUDIT & EDITING FIELDS TO COMMUNITY POSTS
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_community_posts_deleted_at ON public.community_posts(deleted_at);

-- 2. ADD AUDIT & EDITING FIELDS TO COMMENTS
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);

-- 3. UPDATE RLS POLICIES FOR COMMUNITY POSTS
-- Ensure deleted posts are hidden from normal resident feeds
DROP POLICY IF EXISTS "Active posts readable by authenticated users" ON public.community_posts;
CREATE POLICY "Active posts readable by authenticated users"
ON public.community_posts FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL AND status = 'active') OR 
  author_id = auth.uid() OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- Authors can update their own posts (text & attachment), while management can moderate
DROP POLICY IF EXISTS "Author can update own posts" ON public.community_posts;
CREATE POLICY "Author can update own posts"
ON public.community_posts FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
)
WITH CHECK (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- Authors and management can delete / soft-delete posts
DROP POLICY IF EXISTS "Author can delete own posts" ON public.community_posts;
CREATE POLICY "Author can delete own posts"
ON public.community_posts FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- 4. UPDATE RLS POLICIES FOR COMMENTS
DROP POLICY IF EXISTS "Comments readable by authenticated" ON public.comments;
CREATE POLICY "Comments readable by authenticated"
ON public.comments FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL OR 
  author_id = auth.uid() OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- Authors can update their own comments
DROP POLICY IF EXISTS "Author can update own comments" ON public.comments;
CREATE POLICY "Author can update own comments"
ON public.comments FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
)
WITH CHECK (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- Authors and management can delete comments
DROP POLICY IF EXISTS "Author and moderators can delete comments" ON public.comments;
CREATE POLICY "Author and moderators can delete comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- 5. SECURE STORED PROCEDURES FOR CONTENT MANAGEMENT

-- A. Edit Post (Owner only)
CREATE OR REPLACE FUNCTION public.edit_community_post(
  p_post_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_post public.community_posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM public.community_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Only post author may edit content
  IF v_post.author_id != v_actor_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only edit your own posts.';
  END IF;

  UPDATE public.community_posts
  SET 
    title = p_title,
    content = p_content,
    image_url = p_image_url,
    is_edited = TRUE,
    updated_at = NOW()
  WHERE id = p_post_id
  RETURNING * INTO v_post;

  -- Log to audit trail
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, target_type, target_id, details
  )
  SELECT 
    v_actor_id, p.full_name, p.role, 'EDIT_POST', 'community_posts', p_post_id::TEXT,
    jsonb_build_object('title', p_title)
  FROM public.profiles p WHERE p.id = v_actor_id;

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id, 'updated_at', v_post.updated_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Delete Post (Owner or Management)
CREATE OR REPLACE FUNCTION public.delete_community_post(
  p_post_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_post public.community_posts%ROWTYPE;
  v_is_management BOOLEAN;
BEGIN
  SELECT role, full_name INTO v_actor_role, v_actor_name FROM public.profiles WHERE id = v_actor_id;
  SELECT * INTO v_post FROM public.community_posts WHERE id = p_post_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  v_is_management := v_actor_role IN ('management', 'moderator');

  -- Must be owner or management
  IF v_post.author_id != v_actor_id AND NOT v_is_management THEN
    RAISE EXCEPTION 'Unauthorized: Only the author or management can delete this post.';
  END IF;

  -- Soft delete post and cascade to comments
  UPDATE public.community_posts
  SET 
    status = 'archived',
    deleted_at = NOW(),
    deleted_by = v_actor_id,
    moderation_reason = p_reason
  WHERE id = p_post_id;

  UPDATE public.comments
  SET 
    status = 'deleted',
    deleted_at = NOW(),
    deleted_by = v_actor_id,
    moderation_reason = COALESCE(p_reason, 'Parent post deleted')
  WHERE post_id = p_post_id AND deleted_at IS NULL;

  -- Log action
  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, target_type, target_id, details
  )
  VALUES (
    v_actor_id, v_actor_name, v_actor_role,
    CASE WHEN v_is_management AND v_post.author_id != v_actor_id THEN 'MODERATE_DELETE_POST' ELSE 'DELETE_OWN_POST' END,
    'community_posts',
    p_post_id::TEXT,
    jsonb_build_object('post_title', v_post.title, 'author_id', v_post.author_id, 'reason', p_reason, 'is_management', v_is_management)
  );

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id, 'deleted_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Edit Comment (Owner only)
CREATE OR REPLACE FUNCTION public.edit_comment(
  p_comment_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_comment public.comments%ROWTYPE;
BEGIN
  SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  IF v_comment.author_id != v_actor_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only edit your own comments.';
  END IF;

  UPDATE public.comments
  SET 
    content = p_content,
    is_edited = TRUE,
    updated_at = NOW()
  WHERE id = p_comment_id
  RETURNING * INTO v_comment;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, target_type, target_id, details
  )
  SELECT 
    v_actor_id, p.full_name, p.role, 'EDIT_COMMENT', 'comments', p_comment_id::TEXT,
    jsonb_build_object('post_id', v_comment.post_id)
  FROM public.profiles p WHERE p.id = v_actor_id;

  RETURN jsonb_build_object('success', true, 'comment_id', p_comment_id, 'updated_at', v_comment.updated_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Delete Comment (Owner or Management)
CREATE OR REPLACE FUNCTION public.delete_comment(
  p_comment_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_actor_name TEXT;
  v_comment public.comments%ROWTYPE;
  v_is_management BOOLEAN;
BEGIN
  SELECT role, full_name INTO v_actor_role, v_actor_name FROM public.profiles WHERE id = v_actor_id;
  SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  v_is_management := v_actor_role IN ('management', 'moderator');

  IF v_comment.author_id != v_actor_id AND NOT v_is_management THEN
    RAISE EXCEPTION 'Unauthorized: Only the author or management can delete this comment.';
  END IF;

  UPDATE public.comments
  SET 
    status = 'deleted',
    deleted_at = NOW(),
    deleted_by = v_actor_id,
    moderation_reason = p_reason
  WHERE id = p_comment_id;

  -- Decrement replies count on post
  UPDATE public.community_posts
  SET replies_count = GREATEST(0, replies_count - 1)
  WHERE id = v_comment.post_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, target_type, target_id, details
  )
  VALUES (
    v_actor_id, v_actor_name, v_actor_role,
    CASE WHEN v_is_management AND v_comment.author_id != v_actor_id THEN 'MODERATE_DELETE_COMMENT' ELSE 'DELETE_OWN_COMMENT' END,
    'comments',
    p_comment_id::TEXT,
    jsonb_build_object('post_id', v_comment.post_id, 'author_id', v_comment.author_id, 'reason', p_reason, 'is_management', v_is_management)
  );

  RETURN jsonb_build_object('success', true, 'comment_id', p_comment_id, 'deleted_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
