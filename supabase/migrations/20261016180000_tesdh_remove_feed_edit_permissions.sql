-- ============================================================================
-- TESDH Community Hub - Remove Feed Edit Permissions & Enforce Deletion Rules
-- Migration: 20261016180000_tesdh_remove_feed_edit_permissions.sql
-- Features:
--   1. Remove Edit permissions for residents' posts and comments
--   2. Residents can delete their own posts and comments only
--   3. Management can delete any post or comment regardless of ownership
--   4. RLS update restriction: residents strictly denied UPDATE on posts/comments
--   5. Drop / revoke edit stored procedures (edit_community_post, edit_comment)
--   6. Enforce soft deletion and audit logging in delete stored procedures
-- ============================================================================

-- 1. DROP RESIDENT UPDATE POLICIES ON COMMUNITY POSTS & COMMENTS
DROP POLICY IF EXISTS "Author can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Management can update posts for moderation" ON public.community_posts;

-- Strictly allow only management to update posts (e.g. for status changes or moderation)
CREATE POLICY "Management can update posts for moderation"
ON public.community_posts FOR UPDATE
TO authenticated
USING (public.get_auth_role() IN ('management', 'moderator'))
WITH CHECK (public.get_auth_role() IN ('management', 'moderator'));

DROP POLICY IF EXISTS "Author can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Management can update comments for moderation" ON public.comments;

-- Strictly allow only management to update comments (e.g. for soft-delete status or moderation)
CREATE POLICY "Management can update comments for moderation"
ON public.comments FOR UPDATE
TO authenticated
USING (public.get_auth_role() IN ('management', 'moderator'))
WITH CHECK (public.get_auth_role() IN ('management', 'moderator'));

-- 2. ENFORCE DELETION POLICIES (OWNER OR MANAGEMENT ONLY)
DROP POLICY IF EXISTS "Author can delete own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Author or management can delete posts" ON public.community_posts;

CREATE POLICY "Author or management can delete posts"
ON public.community_posts FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

DROP POLICY IF EXISTS "Author and moderators can delete comments" ON public.comments;
DROP POLICY IF EXISTS "Author or management can delete comments" ON public.comments;

CREATE POLICY "Author or management can delete comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  public.get_auth_role() IN ('management', 'moderator')
);

-- 3. REMOVE EDIT STORED PROCEDURES (REVOKE / DROP)
DROP FUNCTION IF EXISTS public.edit_community_post(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.edit_community_post(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.edit_comment(UUID, TEXT);

-- 4. VERIFY / UPDATE SOFT DELETION RPCs FOR POSTS AND COMMENTS
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
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

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

  -- Soft delete post and cascade to comments to preserve auditability
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
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role, full_name INTO v_actor_role, v_actor_name FROM public.profiles WHERE id = v_actor_id;
  SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  v_is_management := v_actor_role IN ('management', 'moderator');

  -- Must be owner or management
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
