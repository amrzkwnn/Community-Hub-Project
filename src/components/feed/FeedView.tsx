'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { useScrollHeader } from '@/lib/hooks/useScrollHeader';
import { PostCategory, CommunityPost, ModerationReason } from '@/types';
import TimeAgo from '@/components/common/TimeAgo';
import ImageUploadArea from '@/components/common/ImageUploadArea';
import { 
  Trash2, 
  ShieldAlert, 
  Loader2, 
  Share2, 
  Bookmark, 
  Flag, 
  Copy,
  Check
} from 'lucide-react';

export default function FeedView() {
  const { 
    posts, 
    upvotePost, 
    addReply, 
    deleteReply,
    getPostComments,
    createPost, 
    deletePost,
    submitModerationReport, 
    incidents,
    setActiveTab,
    currentUser,
    navigationTarget,
    clearNavigationTarget,
    t
  } = useApp();
  
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    handleScroll, 
    headerWrapperRef, 
    headerInnerRef, 
    scrollContainerRef, 
    headerWrapperStyle, 
    headerInnerStyle 
  } = useScrollHeader({ collapseDistance: 200, topThreshold: 5 });
  const [sortOption, setSortOption] = useState<'latest' | 'relevant' | 'official'>('latest');
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState<{ [postId: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Helpful Alerts Counter State (Civic Alert interaction)
  const [helpfulAlerts, setHelpfulAlerts] = useState<{ [alertId: string]: { count: number; active: boolean } }>({
    'default-civic-alert': { count: 24, active: false },
    'inc-1': { count: 18, active: false },
  });
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);
  const [toastProgress, setToastProgress] = useState(false);

  // Success Toast Choreography State (Section 14.A)
  const [successToast, setSuccessToast] = useState<{
    open: boolean;
    heading: string;
    body: string;
  }>({
    open: false,
    heading: 'Dispatched to Elmina Hub',
    body: 'Your dispatch has been verified and published to the City of Elmina resident feed.',
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recentlyInsertedPost, setRecentlyInsertedPost] = useState<CommunityPost | null>(null);

  // Simulation Harness State
  const [isSimulatingLoading, setIsSimulatingLoading] = useState(false);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(null);

  // Delete Post Confirmation Modal State
  const [deletePostModal, setDeletePostModal] = useState<CommunityPost | null>(null);
  const [deletePostReason, setDeletePostReason] = useState('');
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Individual Post Detail View Modal State (Section 11 Bug Fix - PC & Mobile Web)
  const [selectedPostModal, setSelectedPostModal] = useState<CommunityPost | null>(null);

  const openIndividualPost = useCallback((post: CommunityPost) => {
    setSelectedPostModal(post);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'feed');
        url.searchParams.set('id', post.id);
        window.history.pushState({ postId: post.id }, '', url.pathname + url.search);
      } catch {}
    }
  }, []);

  const closeIndividualPost = useCallback(() => {
    setSelectedPostModal(null);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'feed');
        url.searchParams.delete('id');
        window.history.pushState({}, '', url.pathname + url.search);
      } catch {}
    }
  }, []);

  // URL Synchronization & Browser History Navigation for Individual Posts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const id = params.get('id');
        if (tab === 'feed' && id) {
          const found = posts.find((p) => p.id === id);
          if (found) {
            setSelectedPostModal(found);
          }
        } else if (!id) {
          setSelectedPostModal(null);
        }
      } catch {}
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [posts]);

  // Keep selectedPostModal reference fresh if posts data updates
  useEffect(() => {
    if (selectedPostModal) {
      const updated = posts.find((p) => p.id === selectedPostModal.id);
      if (updated && updated !== selectedPostModal) {
        setSelectedPostModal(updated);
      }
    }
  }, [posts, selectedPostModal]);

  // Delete Comment Confirmation Modal State
  const [deleteReplyModal, setDeleteReplyModal] = useState<{
    id: string;
    postId: string;
    authorName: string;
    isManagement: boolean;
  } | null>(null);
  const [deleteReplyReason, setDeleteReplyReason] = useState('');
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  // Create Post Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMinimizingModal, setIsMinimizingModal] = useState(false);
  const [newCategory, setNewCategory] = useState<PostCategory>('discussion');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newIsAnonymous, setNewIsAnonymous] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Moderation Report Modal State
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment' | 'reply';
    targetId: string;
    targetTitle: string;
    targetContent: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState<ModerationReason>('offensive_language');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Verified Incidents from Map
  const verifiedAlerts = incidents.filter(
    (inc) => inc.isVerified && inc.status !== 'resolved'
  );

  // Lock background scroll when any overlay or modal is active
  useEffect(() => {
    const isAnyModalOpen = isCreateOpen || !!deletePostModal || !!deleteReplyModal || !!reportTarget || !!selectedPostModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCreateOpen, deletePostModal, deleteReplyModal, reportTarget, selectedPostModal]);

  // Transient Search Highlight Tracking
  const highlightedElementRef = useRef<{ el: HTMLElement; classes: string[] } | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Deep Navigation Listener for Global Search
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'feed') return;

    const targetItemId = navigationTarget.itemId;
    const targetParentId = navigationTarget.parentId;
    const isComment = navigationTarget.itemType === 'comment';

    // Clear any previous transient highlights immediately
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (highlightedElementRef.current) {
      highlightedElementRef.current.el.classList.remove(
        ...highlightedElementRef.current.classes
      );
      highlightedElementRef.current = null;
    }

    const filterResetTimer = setTimeout(() => {
      setSelectedFilter('all');
      setSearchQuery('');
      if (isComment && targetParentId) {
        setActiveCommentsPostId(targetParentId);
      }
    }, 0);

    let scrollTimer: NodeJS.Timeout | null = null;

    if (isComment && targetParentId) {
      scrollTimer = setTimeout(() => {
        const commentEl = targetItemId ? document.getElementById(`comment-${targetItemId}`) : null;
        if (commentEl) {
          commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const hlClasses = ['ring-2', 'ring-[#9E1315]', 'bg-rose-50/70'];
          commentEl.classList.add(...hlClasses, 'transition-all', 'duration-500');
          highlightedElementRef.current = { el: commentEl, classes: hlClasses };
          highlightTimeoutRef.current = setTimeout(() => {
            commentEl.classList.remove(...hlClasses);
            if (highlightedElementRef.current?.el === commentEl) {
              highlightedElementRef.current = null;
            }
          }, 3500);
        } else {
          const postEl = document.getElementById(`post-${targetParentId}`);
          if (postEl) {
            postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        // Consume one-time navigation target
        clearNavigationTarget();
      }, 250);
    } else if (targetItemId) {
      const targetPost = posts.find((p) => p.id === targetItemId);
      if (targetPost) {
        openIndividualPost(targetPost);
      }
      scrollTimer = setTimeout(() => {
        const postEl = document.getElementById(`post-${targetItemId}`);
        if (postEl) {
          postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const hlClasses = ['ring-2', 'ring-[#9E1315]', 'bg-rose-50/40'];
          postEl.classList.add(...hlClasses, 'transition-all', 'duration-500');
          highlightedElementRef.current = { el: postEl, classes: hlClasses };
          highlightTimeoutRef.current = setTimeout(() => {
            postEl.classList.remove(...hlClasses);
            if (highlightedElementRef.current?.el === postEl) {
              highlightedElementRef.current = null;
            }
          }, 3500);
        }
        // Consume one-time navigation target
        clearNavigationTarget();
      }, 150);
    }

    return () => {
      clearTimeout(filterResetTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [navigationTarget, posts, openIndividualPost, clearNavigationTarget]);

  // Clean up transient highlight and timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (highlightedElementRef.current) {
        highlightedElementRef.current.el.classList.remove(
          ...highlightedElementRef.current.classes
        );
        highlightedElementRef.current = null;
      }
    };
  }, []);

  // Global Escape key support to close any open overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setDeletePostModal(null);
        setDeleteReplyModal(null);
        setReportTarget(null);
        setSimulationAlert(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Trigger Section 14.A Success Toast
  const triggerSuccessSequence = (heading: string, bodyText: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastProgress(false);
    setSuccessToast({
      open: true,
      heading,
      body: bodyText,
    });
    setTimeout(() => {
      setToastProgress(true);
    }, 40);
    toastTimeoutRef.current = setTimeout(() => {
      setSuccessToast((prev) => ({ ...prev, open: false }));
    }, 4200);
  };

  // Toggle Bookmark
  const toggleBookmark = (id: string) => {
    setBookmarkedPosts((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((p) => p !== id) : [...prev, id];
      triggerSuccessSequence(
        exists ? 'Bookmark Removed' : 'Post Bookmarked',
        exists ? 'Notice removed from saved dispatches.' : 'Saved to your personal offline collection.'
      );
      return next;
    });
    setOpenMenuPostId(null);
  };

  // Toggle Helpful on Civic Alert
  const toggleHelpfulAlert = (alertId: string) => {
    setHelpfulAlerts((prev) => {
      const current = prev[alertId] || { count: 24, active: false };
      const nextActive = !current.active;
      const nextCount = nextActive ? current.count + 1 : Math.max(0, current.count - 1);
      return {
        ...prev,
        [alertId]: { count: nextCount, active: nextActive },
      };
    });
  };

  // Filtering & Sorting Posts
  const filteredPosts = posts.filter((post) => {
    // Category filter
    if (selectedFilter === 'alerts') {
      if (post.category !== 'announcement' && post.category !== 'security_alert') return false;
    } else if (selectedFilter === 'discussion') {
      if (post.category !== 'discussion') return false;
    } else if (selectedFilter === 'complaint') {
      if (post.category !== 'complaint') return false;
    } else if (selectedFilter === 'event') {
      if (post.category !== 'event') return false;
    } else if (selectedFilter === 'sustainability') {
      const text = (post.title + ' ' + post.content).toLowerCase();
      const isSustain = text.includes('recycle') || 
                        text.includes('sustain') || 
                        text.includes('garden') || 
                        text.includes('gotong-royong') ||
                        text.includes('plogging');
      if (!isSustain) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchContent = post.content.toLowerCase().includes(q);
      const matchAuthor = post.authorName.toLowerCase().includes(q);
      return matchTitle || matchContent || matchAuthor;
    }
    return true;
  }).sort((a, b) => {
    if (sortOption === 'official') {
      const aOfficial = a.category === 'announcement' || a.category === 'security_alert' || a.isPinned ? 1 : 0;
      const bOfficial = b.category === 'announcement' || b.category === 'security_alert' || b.isPinned ? 1 : 0;
      if (aOfficial !== bOfficial) return bOfficial - aOfficial;
    } else if (sortOption === 'relevant') {
      return (b.upvotesCount + b.repliesCount) - (a.upvotesCount + a.repliesCount);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Handle Post Creation with 5-Step Success Animation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      await createPost({
        category: newCategory,
        title: newTitle,
        content: newContent,
        imageUrl: newImageUrl.trim() || undefined,
        isAnonymous: newIsAnonymous,
      });

      // Step 1: Smooth minimize sequence
      setIsMinimizingModal(true);

      setTimeout(() => {
        setIsCreateOpen(false);
        setIsMinimizingModal(false);
        setIsSubmittingPost(false);

        // Capture newly inserted preview for Step 5
        setRecentlyInsertedPost({
          id: 'temp-' + Date.now(),
          authorId: currentUser.id,
          authorName: newIsAnonymous ? 'Anonymous Resident' : (currentUser.displayName || currentUser.fullName),
          authorPrecinct: currentUser.townshipPrecinct || 'Elmina West',
          authorRole: currentUser.role,
          authorVerified: true,
          category: newCategory,
          title: newTitle,
          content: newContent,
          imageUrl: newImageUrl.trim() || undefined,
          isPinned: false,
          isAnonymous: newIsAnonymous,
          upvotesCount: 0,
          repliesCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setNewTitle('');
        setNewContent('');
        setNewImageUrl('');
        setNewIsAnonymous(false);

        // Step 2 & 3: Pop success toast
        triggerSuccessSequence('Post Success', 'Dispatched to Elmina Hub • Zone West Feed');
      }, 320);
    } catch (err: unknown) {
      setIsSubmittingPost(false);
      setSimulationAlert(err instanceof Error ? err.message : 'Failed to publish post. Please try again.');
    }
  };

  // Section 14 Simulation Controls
  const triggerSimulation = (type: 'success' | 'loading' | 'failure') => {
    if (type === 'success') {
      setIsCreateOpen(true);
      setNewTitle('Elmina Lakeside communal herb garden expanding to Zone 4');
      setNewContent('Free rosemary, mint, and lemongrass cuttings for residents this Sunday! Join near the Central Park pavilion.');
      setTimeout(() => {
        setIsMinimizingModal(true);
        setTimeout(() => {
          setIsCreateOpen(false);
          setIsMinimizingModal(false);
          triggerSuccessSequence('Simulation: Post Success', 'Dispatched to Elmina Hub • Zone West Feed');
        }, 320);
      }, 700);
    } else if (type === 'loading') {
      setIsCreateOpen(true);
      setIsSimulatingLoading(true);
      setTimeout(() => {
        setIsSimulatingLoading(false);
      }, 2400);
    } else if (type === 'failure') {
      setIsCreateOpen(true);
      setIsSimulatingLoading(false);
      setSimulationAlert('Simulation: Municipal connection timed out. Please check zone connectivity.');
    }
  };

  // Upvote / Like with Micro-Bounce
  const handleLikeClick = (e: React.MouseEvent, postId: string) => {
    const btn = e.currentTarget as HTMLElement;
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
      btn.style.transition = 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 100);
    upvotePost(postId);
  };

  // Delete Post
  const handleConfirmDeletePost = async () => {
    if (!deletePostModal) return;

    setIsDeletingPost(true);
    const res = await deletePost(deletePostModal.id, deletePostReason);
    setIsDeletingPost(false);

    if (res.success) {
      setDeletePostModal(null);
      setDeletePostReason('');
      triggerSuccessSequence(
        'Post Removed',
        deletePostModal.authorId === currentUser.id
          ? 'Your post was deleted.'
          : 'Post was moderated and removed by management.'
      );
    } else {
      alert(res.error || 'Failed to delete post.');
    }
  };

  // Reply Submit
  const handleReplySubmit = async (postId: string) => {
    const text = replyInput[postId];
    if (!text || !text.trim()) return;

    setSubmittingReply(postId);
    try {
      await addReply(postId, text);
      setReplyInput((prev) => ({ ...prev, [postId]: '' }));
      triggerSuccessSequence('Reply Posted', 'Your reply is now live on this discussion.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSubmittingReply(null);
    }
  };

  // Delete Reply
  const handleConfirmDeleteReply = async () => {
    if (!deleteReplyModal) return;

    setIsDeletingReply(true);
    const res = await deleteReply(deleteReplyModal.id, deleteReplyReason);
    setIsDeletingReply(false);

    if (res.success) {
      setDeleteReplyModal(null);
      setDeleteReplyReason('');
      triggerSuccessSequence(
        'Comment Removed',
        deleteReplyModal.isManagement
          ? 'Comment moderated and removed.'
          : 'Your comment was deleted.'
      );
    } else {
      alert(res.error || 'Failed to delete comment.');
    }
  };

  // Submit Moderation Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      const res = await submitModerationReport({
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        targetTitle: reportTarget.targetTitle,
        targetContent: reportTarget.targetContent,
        reason: reportReason,
        details: reportDetails,
      });

      if (res.success) {
        setReportTarget(null);
        setReportDetails('');
        triggerSuccessSequence(
          res.isDuplicate ? 'Report Already Queued' : 'Report Submitted',
          res.isDuplicate
            ? 'A report for this content is already under active review by township management.'
            : 'Thank you. Our township moderation team has received your report for prompt review.'
        );
      } else {
        setReportError(res.error || 'Failed to submit report. Please try again.');
      }
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : 'Network error submitting report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Copy Direct Link
  const copyPostLink = (id: string) => {
    const url = `${window.location.origin}/?tab=feed&id=${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      triggerSuccessSequence('Link Copied', 'Direct discussion link copied to your clipboard.');
    }
    setOpenMenuPostId(null);
  };

  return (
    <div className="flex justify-between w-full h-full overflow-hidden bg-[#F8F9FA] dark:bg-[#0F1113] relative">
      {/* ========================================================================= */}
      {/* MOBILE FEED WORKSPACE (Mobile Phone Viewport <= 767px: Google Stitch)     */}
      {/* ========================================================================= */}
      <div className="block md:hidden flex-1 min-h-0 overflow-y-auto w-full pb-28 bg-[#F9FAFB] dark:bg-[#0F1113]">
        {/* Mobile Header Context & Filter Chips (Stitch 2_mobile_feed.html) */}
        <div className="px-4 py-3 bg-white dark:bg-[#15181C] shadow-xs border-b border-slate-200/80 dark:border-slate-800">
          <div className="pt-1 pb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Community Feed
            </h1>
          </div>
          
          {/* Top Filter Chips: Horizontal scrolling pill bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 select-none -mx-4 px-4">
            <button 
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`filter-chip flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-[#9E1315] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>All Feeds</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedFilter === 'all' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                {posts.length}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedFilter('alerts')}
              className={`filter-chip flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'alerts'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-[#9E1315]">campaign</span>
              <span>Announcements</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedFilter('discussion')}
              className={`filter-chip flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'discussion'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>General</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedFilter('sustainability')}
              className={`filter-chip flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'sustainability'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-amber-600">thumb_up</span>
              <span>Recommendations</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedFilter('complaint')}
              className={`filter-chip flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'complaint'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-blue-600">search_check</span>
              <span>Lost &amp; Found</span>
            </button>
            <button 
              type="button"
              onClick={() => setSelectedFilter('complaint')}
              className={`filter-chip flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                selectedFilter === 'complaint'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-emerald-600">handyman</span>
              <span>Infrastructure</span>
            </button>
          </div>
        </div>

        {/* Mobile Feed Body */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {/* Compact Create Post Trigger Card (Stitch 2_mobile_feed.html line 38) */}
          <div className="w-full bg-white dark:bg-[#15181C] rounded-xl p-3 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200/80 dark:border-stone-700 flex items-center justify-center text-xs font-bold">
                  {currentUser.displayName?.[0] || currentUser.fullName?.[0] || 'AZ'}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#15181C]" />
              </div>
              <button 
                type="button"
                id="quick-post-btn"
                onClick={() => setIsCreateOpen(true)}
                className="flex-1 text-left bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 transition-colors px-3 py-2 rounded-lg text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between cursor-pointer"
              >
                <span>Share an update with Elmina...</span>
                <span className="material-symbols-outlined text-slate-400 text-lg">edit_square</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between pt-1 px-1 text-slate-500 dark:text-slate-400 text-[11px] font-medium border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => { setNewCategory('discussion'); setIsCreateOpen(true); }}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#9E1315]">photo_library</span>
                <span>Photo / Media</span>
              </button>
              <button 
                type="button"
                onClick={() => { setNewCategory('complaint'); setIsCreateOpen(true); }}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-amber-600">report_problem</span>
                <span>Civic Issue</span>
              </button>
              <button 
                type="button"
                onClick={() => { setNewCategory('event'); setIsCreateOpen(true); }}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-sky-600">event</span>
                <span>Activity</span>
              </button>
            </div>
          </div>

          {/* Mobile Feed Posts List */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-[#15181C] rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2">forum</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No dispatches found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try selecting a different filter above.</p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isOfficial = post.authorRole === 'management' || post.category === 'announcement' || post.category === 'security_alert';
              const postReplies = getPostComments(post.id);
              const isCommentsOpen = activeCommentsPostId === post.id;
              const isMenuOpen = openMenuPostId === post.id;

              return (
                <article 
                  key={`mobile-${post.id}`}
                  className="w-full bg-white dark:bg-[#15181C] rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col"
                >
                  {/* Top authority color bar for official announcements (Stitch line 67) */}
                  {isOfficial && <div className="h-1.5 w-full bg-[#9E1315]" />}

                  <div className="p-4 flex flex-col gap-2.5">
                    {/* Author Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {isOfficial ? (
                          <div className="w-10 h-10 rounded-xl bg-[#9E1315] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <span className="material-symbols-outlined text-xl">apartment</span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200/80 dark:border-stone-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {post.isAnonymous ? '?' : (post.authorName[0] || 'U')}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {post.isAnonymous ? 'Anonymous Resident' : post.authorName}
                            </span>
                            {isOfficial && (
                              <>
                                <span className="material-symbols-outlined text-sm text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-400 text-[9px] uppercase font-bold tracking-wider">Official</span>
                              </>
                            )}
                            {!isOfficial && (
                              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                                {post.authorPrecinct || 'Elmina West'}
                              </span>
                            )}
                            {!post.isAnonymous && post.authorVerified && !isOfficial && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-semibold" title="Registered account">
                                <span className="material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <TimeAgo date={post.createdAt} />
                          </div>
                        </div>
                      </div>

                      {/* Options menu */}
                      <div className="relative">
                        <button 
                          type="button"
                          aria-label="Notice options"
                          onClick={() => setOpenMenuPostId(isMenuOpen ? null : post.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">more_horiz</span>
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1 w-36 rounded-lg bg-white dark:bg-[#1C2025] border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-30 text-[11px]">
                            <button 
                              type="button"
                              onClick={() => toggleBookmark(post.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {bookmarkedPosts.includes(post.id) ? 'bookmark' : 'bookmark_border'}
                              </span>
                              <span>{bookmarkedPosts.includes(post.id) ? 'Saved' : 'Save Post'}</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => copyPostLink(post.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">share</span>
                              <span>Share Link</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tag & Prominently Displayed Discussion Title */}
                    <div>
                      {post.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold mb-1">
                          {post.category === 'security_alert' ? 'Security Alert' : post.category === 'announcement' ? 'Township Notice' : post.category === 'complaint' ? 'Help & Requests' : post.category === 'event' ? 'Events' : 'Discussion'}
                        </span>
                      )}
                      {post.title && post.title.trim() && (
                        <h2 
                          onClick={() => openIndividualPost(post)}
                          className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug cursor-pointer hover:text-[#9E1315] dark:hover:text-rose-400 transition-colors"
                        >
                          {post.title}
                        </h2>
                      )}
                    </div>

                    {/* Content text */}
                    <p 
                      onClick={() => openIndividualPost(post)}
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer"
                    >
                      {post.content}
                    </p>

                    {/* Attached Photo / Media */}
                    {post.imageUrl && (
                      <div 
                        onClick={() => openIndividualPost(post)}
                        className="rounded-xl overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200/60 dark:border-slate-800"
                      >
                        <img src={post.imageUrl} alt={post.title || 'Post image'} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Municipal Call Banner for Official Notices */}
                    {isOfficial && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#9E1315] text-base">support_agent</span>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-900 dark:text-slate-100 font-semibold">24/7 Control Centre</span>
                            <span className="text-[10px] text-slate-500">03-7845 2222 (Direct Dispatch)</span>
                          </div>
                        </div>
                        <a 
                          href="tel:0378452222"
                          className="px-2.5 py-1 rounded-md bg-[#9E1315] text-white text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-xs">call</span>
                          <span>Call</span>
                        </a>
                      </div>
                    )}

                    {/* Interaction Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => handleLikeClick(e, post.id)}
                          className={`flex items-center gap-1 py-1 px-1.5 rounded hover:text-[#9E1315] active:scale-90 transition-transform cursor-pointer ${
                            post.upvotedByCurrentUser ? 'text-[#9E1315] font-semibold' : ''
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">thumb_up</span>
                          <span>{post.upvotesCount}</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                          className="flex items-center gap-1 py-1 px-1.5 rounded hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">chat_bubble_outline</span>
                          <span>{postReplies.length}</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => copyPostLink(post.id)}
                          className="flex items-center gap-1 py-1 px-1.5 rounded hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">share</span>
                        </button>
                      </div>

                      <button 
                        type="button"
                        onClick={() => toggleBookmark(post.id)}
                        className={`flex items-center gap-1 py-1 px-1.5 rounded hover:text-[#9E1315] active:scale-95 cursor-pointer ${
                          bookmarkedPosts.includes(post.id) ? 'text-[#9E1315]' : ''
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {bookmarkedPosts.includes(post.id) ? 'bookmark' : 'bookmark_border'}
                        </span>
                        <span className="text-[11px]">{bookmarkedPosts.includes(post.id) ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    {/* Collapsible Comments Preview & Quick Reply */}
                    {isCommentsOpen && (
                      <div className="flex flex-col gap-2 pt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                        {postReplies.length === 0 ? (
                          <p className="text-[11px] text-slate-400 py-1 text-center">No comments yet. Be the first to reply!</p>
                        ) : (
                          postReplies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-2 text-xs">
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {reply.authorName[0]}
                              </div>
                              <div className="flex-1 bg-white dark:bg-[#1C2025] p-2 rounded-lg text-slate-800 dark:text-slate-200 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[11px]">{reply.authorName}</span>
                                  <TimeAgo date={reply.createdAt} />
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{reply.content}</p>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Quick Reply Input */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            value={replyInput[post.id] || ''}
                            onChange={(e) => setReplyInput({ ...replyInput, [post.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleReplySubmit(post.id);
                            }}
                            placeholder="Write a civic reply..."
                            className="flex-1 h-8 px-2.5 rounded-lg bg-white dark:bg-[#1C2025] border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#9E1315]"
                          />
                          <button
                            type="button"
                            onClick={() => handleReplySubmit(post.id)}
                            disabled={submittingReply === post.id || !replyInput[post.id]?.trim()}
                            className="h-8 px-2.5 rounded-lg bg-[#9E1315] text-white text-xs font-semibold flex items-center justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP COMMUNITY FEED COLUMN (>= md) - 100% Preserved Desktop Layout     */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 flex-col h-full min-h-0 max-w-[860px] mx-auto overflow-hidden">
        {/* Synchronized Collapsing Header Outer Wrapper */}
        <div 
          ref={headerWrapperRef}
          style={headerWrapperStyle}
          className="header-collapse-wrapper shrink-0 w-full overflow-hidden transition-none"
        >
          <div 
            ref={headerInnerRef}
            style={headerInnerStyle}
            className="header-collapse-inner w-full pt-6 pb-2 px-4 sm:px-8 bg-[#F8F9FA]/95 dark:bg-[#0F1113]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 shadow-xs motion-reduce:transition-none"
          >
          {/* Top Operational Header & Modern Title Hierarchy */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <div>
              <h1 className="text-[28px] font-bold text-slate-900 dark:text-slate-100 tracking-[-0.025em] leading-tight">
                Community Feed
              </h1>
            </div>

            {/* Action Row: Sort Selector & Create Post */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="relative">
                <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as 'latest' | 'relevant' | 'official')}
                  aria-label="Sort community feed posts"
                  className="h-9 pl-3 pr-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-medium shadow-xs focus:outline-none focus:border-slate-400 appearance-none cursor-pointer transition-colors"
                >
                  <option value="latest">Sort: Latest Activity</option>
                  <option value="relevant">Sort: Most Relevant</option>
                  <option value="official">Sort: Official Bulletins First</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]" aria-hidden="true">
                  expand_more
                </span>
              </div>

              <button 
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="h-9 px-4 bg-[#9E1315] hover:bg-[#841012] text-white text-[13px] font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add_circle</span>
                <span>Create Post</span>
              </button>
            </div>
          </div>

          {/* Refined Filter Pills Bar with Smooth Active State Switch */}
          <div role="group" aria-label="Filter community feed by category" className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar mb-2" id="filterPillsContainer">
            <button
              type="button"
              aria-pressed={selectedFilter === 'all'}
              onClick={() => setSelectedFilter('all')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              All Dispatches
            </button>
            <button
              type="button"
              aria-pressed={selectedFilter === 'alerts'}
              onClick={() => setSelectedFilter('alerts')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'alerts'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              Township Alerts
            </button>
            <button
              type="button"
              aria-pressed={selectedFilter === 'discussion'}
              onClick={() => setSelectedFilter('discussion')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'discussion'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              Discussions
            </button>
            <button
              type="button"
              aria-pressed={selectedFilter === 'complaint'}
              onClick={() => setSelectedFilter('complaint')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'complaint'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              Help &amp; Requests
            </button>
            <button
              type="button"
              aria-pressed={selectedFilter === 'event'}
              onClick={() => setSelectedFilter('event')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'event'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              Events &amp; Sports
            </button>
            <button
              type="button"
              aria-pressed={selectedFilter === 'sustainability'}
              onClick={() => setSelectedFilter('sustainability')}
              className={`filter-pill px-3.5 py-1.5 rounded-full text-[12px] font-medium shrink-0 transition-all active:scale-[0.98] cursor-pointer ${
                selectedFilter === 'sustainability'
                  ? 'bg-[#9E1315] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
              }`}
            >
              Sustainability &amp; Recycle
            </button>
          </div>
        </div>
        </div>

        {/* Scrollable Feed Container */}
        <div 
          ref={scrollContainerRef}
          id="feed-scroll-container" 
          onScroll={handleScroll} 
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 pb-8 pt-4"
          style={{ overflowAnchor: 'none' }}
        >

        {/* Refined Resident Composer Trigger Card */}
        <div className="bg-white dark:bg-[#17191C] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm mb-6 transition-all hover:border-slate-300 dark:hover:border-slate-700" id="quickComposerAnchor">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200/80 dark:border-stone-700 flex items-center justify-center text-xs font-bold tracking-tight">
                {currentUser.displayName?.[0] || currentUser.fullName?.[0] || 'AZ'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#17191C]" title="Verified Resident" />
            </div>

            <div className="flex-1">
              <button 
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[13px] transition-colors active:scale-[0.99] cursor-pointer"
              >
                Share an update, propose a community initiative, or inquiry...
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 text-[12px]">
                  <button 
                    type="button"
                    onClick={() => {
                      setNewCategory('discussion');
                      setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors active:scale-[0.98] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px] text-slate-500 dark:text-slate-400">photo_camera</span>
                    <span className="hidden sm:inline">Add Photos</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewCategory('event');
                      setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors active:scale-[0.98] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px] text-amber-700 dark:text-amber-400">calendar_today</span>
                    <span className="hidden sm:inline">Event Tag</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setNewCategory('complaint');
                      setIsCreateOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors active:scale-[0.98] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px] text-[#9E1315] dark:text-rose-400">campaign</span>
                    <span className="hidden sm:inline">Safety Notice</span>
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="h-7 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-medium rounded-md transition-colors active:scale-95 cursor-pointer"
                >
                  Draft Post
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEED STREAM CONTAINER                                                     */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          
          {/* Step 5: Newly Inserted Dispatch Highlight Pulse Anchor */}
          {recentlyInsertedPost && (
            <article className="bg-white dark:bg-[#17191C] rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm p-5 space-y-4 new-dispatch-highlight">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {recentlyInsertedPost.authorName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                        {recentlyInsertedPost.authorName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-100 dark:border-emerald-800">
                        <span className="material-symbols-outlined text-[12px]">verified</span> Just Now
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[12px] mt-0.5">
                      <span>{recentlyInsertedPost.authorPrecinct}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                        {recentlyInsertedPost.category}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300">
                  New Dispatch
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{recentlyInsertedPost.title}</h3>
                <p className="text-[14px] text-slate-800 dark:text-slate-200 leading-relaxed">{recentlyInsertedPost.content}</p>
              </div>

              {recentlyInsertedPost.imageUrl && (
                <div className="rounded-xl overflow-hidden max-h-64 border border-slate-200 dark:border-slate-700">
                  <img src={recentlyInsertedPost.imageUrl} alt={recentlyInsertedPost.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[12px]">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Township Verified Broadcast</span>
                <button 
                  onClick={() => setRecentlyInsertedPost(null)}
                  className="text-xs text-[#9E1315] dark:text-rose-400 hover:underline"
                >
                  Dismiss preview
                </button>
              </div>
            </article>
          )}

          {/* 1. MANAGEMENT VERIFIED ALERT POST (Pinned, Architectural Gravitas) */}
          {(selectedFilter === 'all' || selectedFilter === 'alerts') && (
            verifiedAlerts.length > 0 ? (
              verifiedAlerts.map((alert) => (
                <article 
                  key={alert.id}
                  className="bg-white dark:bg-[#17191C] rounded-2xl border border-rose-200/90 dark:border-rose-950/80 shadow-sm overflow-hidden transition-all"
                >
                  {/* 3px Solid Crimson Top Bar */}
                  <div className="h-1 w-full bg-[#9E1315]" />

                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-[#9E1315] dark:text-rose-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[22px]">shield</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100/80 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300 uppercase tracking-wider">
                              Civic Alert
                            </span>
                            <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                              Elmina Township Management &amp; Auxiliary Police
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-[11px] font-medium">
                              <span className="material-symbols-outlined text-[13px] text-blue-600 dark:text-blue-400">verified</span> 
                              Municipal Verified
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-[12px] mt-1">
                            <span>Community Operations</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span> 
                              {alert.locationName}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <TimeAgo date={alert.createdAt} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/80 text-[#9E1315] dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9E1315] animate-pulse" />
                          Active Monitoring
                        </span>
                      </div>
                    </div>

                    {/* Inner Highlight Operation Box */}
                    <div className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-slate-900 dark:text-slate-100 text-[12px]">
                        <span className="flex items-center gap-1.5 font-semibold text-[#9E1315] dark:text-rose-400">
                          <span className="material-symbols-outlined text-[16px]">engineering</span> 
                          {alert.title}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                          REF: #{alert.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Footnote with Hotline */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">assignment_turned_in</span>
                        <span>Authorized by: Sime Darby Property Township Operations Control • AP Post 02</span>
                      </div>
                      <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">Hotline: 03-7845 2222</span>
                    </div>

                    {/* Alert Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => toggleHelpfulAlert(alert.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors active:scale-95 cursor-pointer ${
                            helpfulAlerts[alert.id]?.active
                              ? 'bg-[#9E1315] text-white border-[#9E1315]'
                              : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100/80 dark:hover:bg-rose-900/80 text-[#9E1315] dark:text-rose-400 border-rose-100 dark:border-rose-900'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                          <span>{helpfulAlerts[alert.id]?.count || 18} Helpful</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setActiveTab('resilience')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[12px] font-medium transition-colors active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-slate-400">map</span>
                          <span>View on Incident Map</span>
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => copyPostLink(alert.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[12px] transition-colors active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">share</span>
                        <span className="hidden sm:inline">Share Notice</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              /* Approved Flagship Civic Alert Display */
              <article className="bg-white dark:bg-[#17191C] rounded-2xl border border-rose-200/90 dark:border-rose-950/80 shadow-sm overflow-hidden transition-all">
                {/* 3px Solid Crimson Top Bar */}
                <div className="h-1 w-full bg-[#9E1315]" />

                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 text-[#9E1315] dark:text-rose-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">shield</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100/80 dark:bg-rose-950/80 text-[#9E1315] dark:text-rose-300 uppercase tracking-wider">
                            Civic Alert
                          </span>
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                            Elmina Township Management &amp; Auxiliary Police
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-[11px] font-medium">
                            <span className="material-symbols-outlined text-[13px] text-blue-600 dark:text-blue-400">verified</span> 
                            Municipal Verified
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-[12px] mt-1">
                          <span>Community Operations</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span> 
                            Elmina Central Park &amp; Lakeside
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span>15 mins ago</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/80 text-[#9E1315] dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9E1315] animate-pulse" />
                        Active Monitoring
                      </span>
                    </div>
                  </div>

                  {/* Inner Highlight Operation Box */}
                  <div className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-900 dark:text-slate-100 text-[12px]">
                      <span className="flex items-center gap-1.5 font-semibold text-[#9E1315] dark:text-rose-400">
                        <span className="material-symbols-outlined text-[16px]">engineering</span> 
                        Infrastructure Drainage Operations
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                        REF: #ELM-2025-089
                      </span>
                    </div>
                    <p className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Scheduled drainage clearing and culvert inspection along <strong className="font-medium text-slate-900 dark:text-slate-100">Elmina Valley 3 connector road</strong> today from 2:00 PM – 5:30 PM. One lane will be temporarily cordoned off with safety cones. Please drive cautiously and cooperate with Auxiliary Police flag marshals on duty.
                    </p>
                  </div>

                  {/* Footnote with Hotline */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">assignment_turned_in</span>
                      <span>Authorized by: Sime Darby Property Township Operations Control • AP Post 02</span>
                    </div>
                    <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">Hotline: 03-7845 2222</span>
                  </div>

                  {/* Alert Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => toggleHelpfulAlert('default-civic-alert')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors active:scale-95 cursor-pointer ${
                          helpfulAlerts['default-civic-alert']?.active
                            ? 'bg-[#9E1315] text-white border-[#9E1315]'
                            : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100/80 dark:hover:bg-rose-900/80 text-[#9E1315] dark:text-rose-400 border-rose-100 dark:border-rose-900'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                        <span>{helpfulAlerts['default-civic-alert']?.count || 24} Helpful</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveCommentsPostId(activeCommentsPostId === 'alert-civic' ? null : 'alert-civic')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[12px] font-medium transition-colors active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">chat_bubble_outline</span>
                        <span>6 Comments</span>
                      </button>
                    </div>
                    <button 
                      type="button"
                      onClick={() => copyPostLink('ELM-2025-089')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[12px] transition-colors active:scale-95 cursor-pointer"
                      title="Copy Direct Notice Link"
                    >
                      <span className="material-symbols-outlined text-[16px]">share</span>
                      <span className="hidden sm:inline">Share Notice</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          )}

          {/* 2. REGULAR RESIDENT COMMUNITY POSTS */}
          {filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-[#17191C] rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">forum</span>
              <h4 className="font-bold text-base text-slate-700 dark:text-slate-200">No dispatches found</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                No posts match your selected filter. Propose an update or inquiry to your neighbours.
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const isCommentsOpen = activeCommentsPostId === post.id;
              const postReplies = getPostComments(post.id);
              const isMenuOpen = openMenuPostId === post.id;
              const isAuthor = post.authorId === currentUser.id;
              const isManagement = currentUser.role === 'management';

              return (
                <article 
                  key={post.id}
                  id={`post-${post.id}`}
                  className="bg-white dark:bg-[#17191C] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Post Header: Author Avatar & Metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        post.authorRole === 'management'
                          ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-[#9E1315] dark:text-rose-400'
                          : post.category === 'complaint'
                          ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-sky-800 dark:text-sky-300'
                          : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                      }`}>
                        {post.isAnonymous ? '?' : (post.authorName[0] || 'U')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                            {post.isAnonymous ? 'Anonymous Resident' : post.authorName}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                            <span className="material-symbols-outlined text-[12px] text-slate-400 dark:text-slate-500">verified</span>
                            {post.authorRole === 'management' ? 'Management' : 'Resident'}
                          </span>
                          {!post.isAnonymous && post.authorVerified && post.authorRole !== 'management' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-semibold" title="Registered account">
                              <span className="material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[12px] mt-0.5">
                          <span>{post.authorPrecinct || 'City of Elmina'}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                            {post.category === 'security_alert' ? 'Security Alert' : post.category === 'announcement' ? 'Township Notice' : post.category === 'complaint' ? 'Help & Requests' : post.category === 'event' ? 'Events' : 'Discussion'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <TimeAgo date={post.createdAt} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.badgeText && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700">
                          {post.badgeText}
                        </span>
                      )}

                      {/* Post Options Menu Dropdown */}
                      <div className="relative">
                        <button 
                          type="button"
                          aria-label="Post Options"
                          onClick={() => setOpenMenuPostId(isMenuOpen ? null : post.id)}
                          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>

                        {isMenuOpen && (
                          <div className="post-menu absolute right-0 mt-1 w-40 rounded-lg bg-white dark:bg-[#1C2025] border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-30 text-[12px] transition-all duration-150 animate-in fade-in">
                            <button 
                              type="button"
                              onClick={() => toggleBookmark(post.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px] text-slate-400 dark:text-slate-400">
                                {bookmarkedPosts.includes(post.id) ? 'bookmark' : 'bookmark_border'}
                              </span>
                              <span>{bookmarkedPosts.includes(post.id) ? 'Bookmarked' : 'Bookmark'}</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => copyPostLink(post.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px] text-slate-400 dark:text-slate-400">link</span>
                              <span>Copy Link</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setReportTarget({
                                  targetType: 'post',
                                  targetId: post.id,
                                  targetTitle: post.title || 'Community Post',
                                  targetContent: post.content,
                                });
                                setOpenMenuPostId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">flag</span>
                              <span>Report Post</span>
                            </button>

                            {/* Delete Action (Strictly Owner or Management, NO EDIT) */}
                            {(isAuthor || isManagement) && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setDeletePostModal(post);
                                  setOpenMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>{isAuthor ? 'Delete Post' : 'Moderate & Remove'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="space-y-1.5">
                    {post.title && post.title.trim() && (
                      <h3 
                        onClick={() => openIndividualPost(post)}
                        className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug cursor-pointer hover:text-[#9E1315] dark:hover:text-rose-400 transition-colors"
                      >
                        {post.title}
                      </h3>
                    )}
                    <p 
                      onClick={() => openIndividualPost(post)}
                      className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line cursor-pointer"
                    >
                      {post.content}
                    </p>
                  </div>

                  {/* Attached Photos Responsive Gallery */}
                  {post.galleryImages && post.galleryImages.length > 1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl overflow-hidden">
                      {post.galleryImages.map((imgUrl, imgIdx) => (
                        <div key={imgIdx} className="relative h-56 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden group border border-slate-200/60 dark:border-slate-700">
                          <img 
                            src={imgUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                          />
                          {post.imageLabels?.[imgIdx] && (
                            <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-[11px] text-white font-medium">
                              {post.imageLabels[imgIdx]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : post.imageUrl ? (
                    <div className="relative max-w-md rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 group">
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        className="w-full h-64 object-cover group-hover:scale-[1.01] transition-transform duration-300"
                        loading="lazy"
                      />
                      {post.imageLabels?.[0] ? (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-[11px] text-white font-medium flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px] text-emerald-400">health_and_safety</span>
                          <span>{post.imageLabels[0]}</span>
                        </div>
                      ) : (
                        <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-[11px] text-white font-medium">
                          {post.authorPrecinct || 'City of Elmina'}
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Action Footer: Like, Comments & Share / Contact Guardhouse */}
                  <div className="flex items-center justify-between pt-1 text-slate-500 dark:text-slate-400 text-[12px]">
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={(e) => handleLikeClick(e, post.id)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          post.upvotedByCurrentUser ? 'text-[#9E1315] dark:text-rose-400 font-semibold' : 'hover:text-[#9E1315] dark:hover:text-rose-400'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${post.upvotedByCurrentUser ? 'text-[#9E1315] dark:text-rose-400' : ''}`}>
                          {post.upvotedByCurrentUser ? 'favorite' : 'favorite_border'}
                        </span>
                        <span className="like-count font-medium">{post.upvotesCount}</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => openIndividualPost(post)}
                        className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                        <span className="font-medium">{postReplies.length} comments</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => openIndividualPost(post)}
                        className="hidden sm:inline-block text-[12px] font-medium text-slate-500 hover:text-[#9E1315] dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        View Discussion
                      </button>
                    </div>

                    {post.badgeText === 'Open Case' ? (
                      <button 
                        type="button"
                        onClick={() => triggerSuccessSequence('Guardhouse Contact', 'Calling Ilham 2 Guardhouse 4: 03-7845 2244')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-medium transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">call</span>
                        <span>Contact Guardhouse</span>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => copyPostLink(post.id)}
                        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">share</span>
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    )}
                  </div>

                  {/* Expanded Comments Thread Accordion */}
                  {isCommentsOpen && (
                    <div className="space-y-3 pt-3 bg-slate-50/70 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800 transition-all duration-300">
                      {/* Nested Replies List */}
                      {postReplies.length > 0 ? (
                        <div className="space-y-2.5">
                          {postReplies.map((reply) => {
                            const isReplyAuthor = reply.authorId === currentUser.id;
                            const canDelete = isReplyAuthor || currentUser.role === 'management';

                            return (
                              <div key={reply.id} id={`comment-${reply.id}`} className="flex items-start gap-3 rounded-xl p-1 transition-all">
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-semibold shrink-0">
                                  {reply.authorName[0]}
                                </div>
                                <div className="bg-white dark:bg-[#1C2025] rounded-lg p-3 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">
                                        {reply.authorName}
                                      </span>
                                      {reply.authorId === post.authorId && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          Author
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                        <TimeAgo date={reply.createdAt} />
                                      </span>
                                      {!isReplyAuthor && (
                                        <button
                                          type="button"
                                          onClick={() => setReportTarget({
                                            targetType: 'reply',
                                            targetId: reply.id,
                                            targetTitle: `Comment by ${reply.authorName}`,
                                            targetContent: reply.content,
                                          })}
                                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer p-0.5"
                                          title="Report comment to moderators"
                                        >
                                          <Flag className="w-3 h-3" />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          type="button"
                                          onClick={() => setDeleteReplyModal({
                                            id: reply.id,
                                            postId: post.id,
                                            authorName: reply.authorName,
                                            isManagement: currentUser.role === 'management',
                                          })}
                                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-2">
                          No replies yet. Join the conversation with your neighbours!
                        </p>
                      )}

                      {/* Reply Input Bar */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <div className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {currentUser.displayName?.[0] || currentUser.fullName?.[0] || 'AZ'}
                        </div>
                        <input 
                          type="text"
                          value={replyInput[post.id] || ''}
                          onChange={(e) => setReplyInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReplySubmit(post.id);
                          }}
                          placeholder="Write a constructive reply..."
                          className="h-8 flex-1 px-3 rounded-lg bg-white dark:bg-[#15181C] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                        />
                        <button 
                          type="button"
                          onClick={() => handleReplySubmit(post.id)}
                          disabled={submittingReply === post.id}
                          className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {submittingReply === post.id ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 14 INTERACTIVE MOTION BENCH / SIMULATION CONTROL BAR              */}
        {/* ========================================================================= */}
        <div className="mt-8 p-4 rounded-xl bg-white dark:bg-[#17191C] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#9E1315] dark:text-rose-400 text-[18px]">
              motion_photos_on
            </span>
            <span className="text-[12px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Section 14 Motion Sequence Harness:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              onClick={() => triggerSimulation('success')}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100/80 dark:hover:bg-rose-900/80 text-[#9E1315] dark:text-rose-400 border border-rose-200/80 dark:border-rose-900 text-[11px] font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">thumb_up</span>
              <span>Simulate Success Flow</span>
            </button>
            <button 
              type="button"
              onClick={() => triggerSimulation('loading')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
              <span>Simulate Loading State</span>
            </button>
            <button 
              type="button"
              onClick={() => triggerSimulation('failure')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 text-slate-700 dark:text-slate-200 text-[11px] font-medium border border-transparent transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">error_outline</span>
              <span>Simulate Failure State</span>
            </button>
          </div>
        </div>

        {/* Desktop Footer inside Scrollable Feed */}
        <footer className="mt-12 pt-8 pb-16 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#9E1315] text-white flex items-center justify-center font-bold text-[10px]">
                SD
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                City of Elmina Community Hub • Sime Darby Property
              </span>
            </div>
            <span>© 2026 Sime Darby Property Berhad • PDPA Protected</span>
          </div>
        </footer>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 14.A REUSABLE SUCCESS CARD POP TOAST                              */}
      {/* ========================================================================= */}
      {successToast.open && (
        <div className="fixed bottom-8 right-8 z-50 max-w-sm rounded-2xl bg-white dark:bg-[#1C2025] border border-rose-100 dark:border-rose-950/80 shadow-[0_8px_30px_rgba(0,0,0,0.25)] p-4.5 overflow-hidden transition-all toast-spring-pop">
          <div className="flex items-start gap-3.5 relative">
            {/* Animated Sparkle Accents */}
            <div className="sparkle-burst absolute -top-1.5 -left-1 text-amber-400 text-[13px] select-none pointer-events-none">
              ✦
            </div>
            <div className="sparkle-burst absolute top-6 -left-2 text-rose-400 text-[11px] select-none pointer-events-none" style={{ animationDelay: '350ms' }}>
              ★
            </div>

            {/* Animated SVG Thumbs-up Badge (Step 4: rise + bounce + 8deg settle) */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-50 via-rose-100 to-amber-50 dark:from-rose-950/80 dark:via-rose-900/60 dark:to-stone-900 border border-rose-200/90 dark:border-rose-900/80 text-[#9E1315] dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
              <svg className="w-6 h-6 thumbs-up-svg text-[#9E1315] dark:text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32 0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2zM1 9h4v12H1z" />
              </svg>
            </div>

            <div className="flex-1 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {successToast.heading}
                </span>
                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Live
                </span>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                {successToast.body}
              </p>
            </div>

            <button 
              type="button"
              aria-label="Close notification"
              onClick={() => setSuccessToast((prev) => ({ ...prev, open: false }))}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Progress auto-dismiss hairline indicator */}
          <div className="mt-3.5 h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#9E1315] dark:bg-rose-500 transition-all duration-[4000ms] ease-linear"
              style={{ width: toastProgress ? '0%' : '100%' }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 14.A POST COMPOSER MODAL (With Scroll Lock & Focus Trap)          */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateOpen(false);
              setSimulationAlert(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-200"
        >
          <div className={`bg-white dark:bg-[#17191C] w-full max-w-xl max-h-[90dvh] max-h-[90vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimizingModal ? 'modal-minimize-out' : 'scale-100'
          }`}>
            {/* Modal Header (Fixed at top) */}
            <div className="shrink-0 px-6 py-4 bg-stone-50/80 dark:bg-stone-900/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9E1315] dark:text-rose-400 text-[20px]">
                  post_add
                </span>
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  Publish to Elmina Community
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setSimulationAlert(null);
                }}
                aria-label="Close publish post dialog"
                className="w-7 h-7 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
              </button>
            </div>

            {/* Error / Simulation Alert Banner */}
            {simulationAlert && (
              <div className="shrink-0 px-6 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-[12px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#9E1315] dark:text-rose-400" aria-hidden="true">info</span>
                  <span>{simulationAlert}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setSimulationAlert(null)}
                  aria-label="Dismiss alert"
                  className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">close</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton Overlay (Used during Loading state simulation or uploading) */}
            {isSimulatingLoading ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-32" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse w-24" />
                  </div>
                </div>
                <div className="space-y-2 py-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-4/5" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse w-2/3" />
                </div>
                <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-slate-400 animate-spin">
                    progress_activity
                  </span>
                  <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                    Validating township dispatch with Elmina gateway...
                  </span>
                </div>
              </div>
            ) : (
              /* Modal Form */
              <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Content Body */}
                <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 focus:outline-hidden">
                  {/* Author Context */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-[#9E1315] dark:text-rose-400 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-xs font-bold">
                        {currentUser.displayName?.[0] || currentUser.fullName?.[0] || 'AZ'}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          {newIsAnonymous ? 'Anonymous Resident' : (currentUser.displayName || currentUser.fullName)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Verified Resident • {currentUser.townshipPrecinct || 'Elmina West'}
                        </div>
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="relative">
                      <select 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as PostCategory)}
                        aria-label="Select post category"
                        className="h-8 pl-2.5 pr-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium appearance-none cursor-pointer focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
                      >
                        <option value="discussion">Discussion</option>
                        <option value="complaint">Help &amp; Requests</option>
                        <option value="event">Events &amp; Sports</option>
                        {currentUser.role === 'management' && (
                          <option value="announcement">Township Announcement</option>
                        )}
                        {(currentUser.role === 'management' || currentUser.role === 'security') && (
                          <option value="security_alert">Neighborhood Alert</option>
                        )}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]" aria-hidden="true">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <input 
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Enter dispatch title (e.g. Zone 4 Communal Herb Garden)..."
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#15181C] text-slate-900 dark:text-slate-100 text-[13.5px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200/80 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Content Input */}
                  <div>
                    <textarea 
                      required
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="What's happening in Elmina? Share details, recommendations, or municipal queries..."
                      className="w-full p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#15181C] text-slate-900 dark:text-slate-100 text-[13.5px] placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200/80 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Real Supabase Photo Upload Area */}
                  <div>
                    <ImageUploadArea
                      bucket="community-media"
                      folder="feed"
                      multiple={false}
                      currentUrls={newImageUrl ? [newImageUrl] : []}
                      onUploadComplete={(urls: string[]) => setNewImageUrl(urls[0] || '')}
                      onRemove={() => setNewImageUrl('')}
                      helperText="Upload photos or municipal attachments (PNG, JPG or WebP up to 10MB)"
                    />
                  </div>

                  {/* Anonymity Toggle for Help/Complaints */}
                  {newCategory === 'complaint' && (
                    <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-amber-900 dark:text-amber-200">
                        <input 
                          type="checkbox"
                          checked={newIsAnonymous}
                          onChange={(e) => setNewIsAnonymous(e.target.checked)}
                          className="rounded text-[#9E1315] focus:ring-[#9E1315] w-4 h-4 cursor-pointer"
                        />
                        <span>Conceal my identity from neighbours (Anonymous mode)</span>
                      </label>
                    </div>
                  )}

                  {/* Township Community Pledge Note */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="material-symbols-outlined text-[15px] text-slate-500 shrink-0 mt-0.5">
                      verified_user
                    </span>
                    <span>
                      TESDH Hub adheres to the Sime Darby Township Civic Code. Respect privacy and maintain civil discourse.
                    </span>
                  </div>
                </div>

                {/* Sticky Action Footer Buttons */}
                <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#17191C]/95 backdrop-blur-xs flex items-center justify-between z-10">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Auto-save draft active</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-medium transition-colors active:scale-95 cursor-pointer"
                    >
                      {t('btnCancel')}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmittingPost}
                      className="px-4 py-2 rounded-lg bg-[#9E1315] hover:bg-[#841012] text-white text-[13px] font-medium shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPost ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      )}
                      <span>{t('btnPublish')}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE POST CONFIRMATION DIALOG                                           */}
      {/* ========================================================================= */}
      {deletePostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17191C] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#9E1315] dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {deletePostModal.authorId === currentUser.id
                    ? 'Delete Your Post?'
                    : 'Management Moderation: Delete Post?'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {deletePostModal.authorId === currentUser.id
                    ? 'This post will be permanently removed from public view.'
                    : 'This action will be logged in the township management audit trail.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mb-4">
              <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{deletePostModal.title}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2 mt-1">{deletePostModal.content}</p>
            </div>

            {currentUser.role === 'management' && deletePostModal.authorId !== currentUser.id && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Moderation Reason (Required for Audit Log)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Violation of community guidelines: spam or inappropriate"
                  value={deletePostReason}
                  onChange={(e) => setDeletePostReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-[#9E1315] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeletePostModal(null);
                  setDeletePostReason('');
                }}
                disabled={isDeletingPost}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePost}
                disabled={isDeletingPost}
                className="bg-[#9E1315] hover:bg-[#841012] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingPost && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE COMMENT CONFIRMATION DIALOG                                        */}
      {/* ========================================================================= */}
      {deleteReplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17191C] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[#9E1315] dark:text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {deleteReplyModal.isManagement
                    ? 'Management Moderation: Delete Comment?'
                    : 'Delete Your Comment?'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {deleteReplyModal.isManagement
                    ? `Remove comment by ${deleteReplyModal.authorName}. Logged in the audit trail.`
                    : 'Are you sure you want to remove your comment?'}
                </p>
              </div>
            </div>

            {deleteReplyModal.isManagement && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Moderation Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inappropriate language"
                  value={deleteReplyReason}
                  onChange={(e) => setDeleteReplyReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-[#9E1315] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeleteReplyModal(null);
                  setDeleteReplyReason('');
                }}
                disabled={isDeletingReply}
                className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReply}
                disabled={isDeletingReply}
                className="bg-[#9E1315] hover:bg-[#841012] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingReply && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODERATION REPORT MODAL                                                   */}
      {/* ========================================================================= */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17191C] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-[#9E1315] dark:text-rose-400" />
                {reportTarget.targetType === 'post' ? 'Report Post to Moderator' : 'Report Comment to Moderator'}
              </h4>
              <button 
                type="button" 
                onClick={() => { setReportTarget(null); setReportError(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 mb-3.5 border border-slate-200/70 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate">
                {reportTarget.targetTitle}
              </span>
              <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 text-[11.5px] italic">
                &ldquo;{reportTarget.targetContent}&rdquo;
              </p>
            </div>

            {reportError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{reportError}</span>
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Report <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ModerationReason)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#9E1315]/20 focus:outline-none"
                >
                  <option value="offensive_language">Profanity or Offensive Language</option>
                  <option value="harassment">Harassment or Bullying</option>
                  <option value="hate_speech">Hate or Discriminatory Abuse</option>
                  <option value="threats_violence">Threats or Violence</option>
                  <option value="spam">Spam or Unsolicited Commercial Ads</option>
                  <option value="scam_fraud">Scam or Financial Fraud</option>
                  <option value="privacy_violation">Privacy Violation / Doxxing</option>
                  <option value="false_information">Misleading / False Emergency Claims</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="other">Other Concern</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Additional Explanation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Explain why this content violates community guidelines..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-[#9E1315]/20 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setReportTarget(null); setReportError(null); }}
                  disabled={isSubmittingReport}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="bg-[#9E1315] hover:bg-[#841012] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 transition-all"
                >
                  {isSubmittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingReport ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* INDIVIDUAL POST / DISCUSSION DETAIL VIEW (PC & MOBILE WEB)               */}
      {/* ========================================================================= */}
      {selectedPostModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="individual-post-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-[#17191C] w-full sm:max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Top Header / Breadcrumb Bar */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#17191C]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const draft = selectedPostModal ? replyInput[selectedPostModal.id]?.trim() : '';
                  if (draft && draft.length > 0) {
                    if (!window.confirm('You have an unsent comment draft. Are you sure you want to return to Community Feed?')) {
                      return;
                    }
                  }
                  closeIndividualPost();
                }}
                className="inline-flex items-center gap-2 h-10 px-3.5 -ml-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm active:scale-95 transition-all cursor-pointer shadow-2xs group"
                aria-label="Back to Community Feed"
              >
                <span className="material-symbols-outlined text-[20px] text-[#9E1315] dark:text-rose-400 group-hover:-translate-x-0.5 transition-transform shrink-0">
                  arrow_back
                </span>
                <span>Back to Feed</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyPostLink(selectedPostModal.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copy post link"
                  aria-label="Share post"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                </button>
                <button
                  type="button"
                  onClick={closeIndividualPost}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close post view"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Scrollable Post Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* Discussion Title (Prominently displayed above post body, only if title exists and non-empty) */}
              {selectedPostModal.title && selectedPostModal.title.trim() && (
                <h1 
                  id="individual-post-title"
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug break-words"
                >
                  {selectedPostModal.title}
                </h1>
              )}

              {/* Author & Timestamp Hierarchy */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedPostModal.authorRole === 'management'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-[#9E1315] dark:text-rose-400'
                      : selectedPostModal.category === 'complaint'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 text-sky-800 dark:text-sky-300'
                      : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                  }`}>
                    {selectedPostModal.isAnonymous ? '?' : (selectedPostModal.authorName[0] || 'U')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                        {selectedPostModal.isAnonymous ? 'Anonymous Resident' : selectedPostModal.authorName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                        <span className="material-symbols-outlined text-[12px] text-slate-400 dark:text-slate-500">verified</span>
                        {selectedPostModal.authorRole === 'management' ? 'Management' : 'Resident'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[12px] mt-0.5">
                      <span>{selectedPostModal.authorPrecinct || 'City of Elmina'}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px]">
                        {selectedPostModal.category === 'security_alert' ? 'Security Alert' : selectedPostModal.category === 'announcement' ? 'Township Notice' : selectedPostModal.category === 'complaint' ? 'Help & Requests' : selectedPostModal.category === 'event' ? 'Events' : 'Discussion'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <TimeAgo date={selectedPostModal.createdAt} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Discussion Body */}
              <div className="text-[14.5px] sm:text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                {selectedPostModal.content}
              </div>

              {/* Attached Gallery Images */}
              {selectedPostModal.galleryImages && selectedPostModal.galleryImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl overflow-hidden pt-2">
                  {selectedPostModal.galleryImages.map((imgUrl, imgIdx) => (
                    <div key={imgIdx} className="relative h-60 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-700">
                      <img 
                        src={imgUrl} 
                        alt={selectedPostModal.title || 'Attached photo'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : selectedPostModal.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden max-h-96 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 pt-2">
                  <img 
                    src={selectedPostModal.imageUrl} 
                    alt={selectedPostModal.title || 'Attached photo'} 
                    className="w-full h-auto max-h-96 object-cover rounded-xl"
                  />
                </div>
              ) : null}

              {/* Engagement Stats & Actions Bar */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => handleLikeClick(e, selectedPostModal.id)}
                    className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedPostModal.upvotedByCurrentUser ? 'text-[#9E1315] dark:text-rose-400 font-semibold' : 'hover:text-[#9E1315] dark:hover:text-rose-400'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${selectedPostModal.upvotedByCurrentUser ? 'text-[#9E1315] dark:text-rose-400' : ''}`}>
                      {selectedPostModal.upvotedByCurrentUser ? 'favorite' : 'favorite_border'}
                    </span>
                    <span>{selectedPostModal.upvotesCount}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                    <span>{getPostComments(selectedPostModal.id).length} comments</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReportTarget({
                    targetType: 'post',
                    targetId: selectedPostModal.id,
                    targetTitle: selectedPostModal.title || 'Community Post',
                    targetContent: selectedPostModal.content,
                  })}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  <span className="text-xs">Report</span>
                </button>
              </div>

              {/* Comments & Replies Thread */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Discussion Replies ({getPostComments(selectedPostModal.id).length})
                </h3>

                <div className="space-y-2.5">
                  {getPostComments(selectedPostModal.id).map((reply) => {
                    const isReplyAuthor = reply.authorId === currentUser.id;
                    const canDelete = isReplyAuthor || currentUser.role === 'management';

                    return (
                      <div key={reply.id} id={`detail-comment-${reply.id}`} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {reply.authorName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">
                                {reply.authorName}
                              </span>
                              {reply.authorId === selectedPostModal.authorId && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Author
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                <TimeAgo date={reply.createdAt} />
                              </span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteReplyModal({
                                    id: reply.id,
                                    postId: selectedPostModal.id,
                                    authorName: reply.authorName,
                                    isManagement: currentUser.role === 'management' && !isReplyAuthor,
                                  })}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-500" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[13px] text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line break-words">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {getPostComments(selectedPostModal.id).length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">
                      No replies yet. Be the first neighbor to respond to this discussion!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Reply Input Composer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#17191C] p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const text = replyInput[selectedPostModal.id]?.trim();
                  if (!text) return;
                  setSubmittingReply(selectedPostModal.id);
                  try {
                    await addReply(selectedPostModal.id, text);
                    setReplyInput((prev) => ({ ...prev, [selectedPostModal.id]: '' }));
                    triggerSuccessSequence('Reply Published', 'Your comment was posted to the discussion.');
                  } finally {
                    setSubmittingReply(null);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyInput[selectedPostModal.id] || ''}
                  onChange={(e) => setReplyInput({ ...replyInput, [selectedPostModal.id]: e.target.value })}
                  placeholder="Write a neighborly reply to this discussion..."
                  className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:border-[#9E1315]"
                />
                <button
                  type="submit"
                  disabled={submittingReply === selectedPostModal.id || !replyInput[selectedPostModal.id]?.trim()}
                  className="h-10 px-4 rounded-xl bg-[#9E1315] hover:bg-[#841012] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {submittingReply === selectedPostModal.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  <span className="hidden sm:inline">Reply</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
