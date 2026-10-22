import { describe, it } from 'node:test';
import assert from 'node:assert';

type UserRole = 'resident' | 'moderator' | 'management' | 'security';

interface UserProfile {
  id: string;
  fullName: string;
  displayName: string;
  role: UserRole;
  townshipPrecinct: string;
  unitNumber?: string;
  phone?: string;
  verificationStatus: string;
  createdAt: string;
}

interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorRole: UserRole;
  authorVerified: boolean;
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
  isPinned: boolean;
  isAnonymous: boolean;
  upvotesCount: number;
  repliesCount: number;
  status: string;
  isEdited?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PostReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPrecinct: string;
  authorRole: UserRole;
  authorVerified: boolean;
  content: string;
  isOfficialResponse: boolean;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

describe('Community Feed — Remove Edit Permissions & Enforce Deletion Rules', () => {
  // Test fixture setup with two resident accounts and one management account
  const RESIDENT_1: UserProfile = {
    id: 'user-nurul',
    fullName: 'Nurul Huda binti Ahmad',
    displayName: 'Nurul (EG3)',
    role: 'resident',
    townshipPrecinct: 'Elmina Green 3',
    unitNumber: '24, Jalan EG 3/4',
    phone: '+6012-345 6781',
    verificationStatus: 'verified',
    createdAt: '2026-01-10T08:00:00Z',
  };

  const RESIDENT_2: UserProfile = {
    id: 'user-vikram',
    fullName: 'Vikram Naidu a/l Mohan',
    displayName: 'Vikram (Denai)',
    role: 'resident',
    townshipPrecinct: 'Denai Alam',
    unitNumber: '12, Jalan Denai 2/1',
    phone: '+6013-987 6542',
    verificationStatus: 'verified',
    createdAt: '2026-02-14T09:30:00Z',
  };

  const MANAGEMENT_USER: UserProfile = {
    id: 'user-azman',
    fullName: 'Capt. (R) Azman Salleh',
    displayName: 'Elmina Management (Capt Azman)',
    role: 'management',
    townshipPrecinct: 'Elmina Central Park Hub',
    unitNumber: 'JMB Office Level 1',
    phone: '+6019-223 3445',
    verificationStatus: 'verified',
    createdAt: '2025-11-01T08:00:00Z',
  };

  // State container mimicking AppContext feed moderation logic
  class FeedModerationState {
    posts: CommunityPost[];
    comments: { [postId: string]: PostReply[] };
    auditLogs: AuditLog[];

    constructor() {
      this.posts = [
        {
          id: 'post-1',
          authorId: 'user-azman',
          authorName: 'Capt. (R) Azman Salleh',
          authorPrecinct: 'Township Management',
          authorRole: 'management',
          authorVerified: true,
          category: 'announcement',
          title: 'Official Notice: Drainage Inspection',
          content: 'Drainage inspections will take place next Monday.',
          isPinned: true,
          isAnonymous: false,
          upvotesCount: 42,
          repliesCount: 2,
          status: 'active',
          isEdited: false,
          createdAt: '2026-10-15T08:30:00Z',
          updatedAt: '2026-10-15T08:30:00Z',
        },
        {
          id: 'post-3',
          authorId: 'user-nurul',
          authorName: 'Nurul Huda',
          authorPrecinct: 'Elmina Green 3',
          authorRole: 'resident',
          authorVerified: true,
          category: 'event',
          title: 'Community Gotong-Royong 2026',
          content: 'Join neighbours this Saturday morning at lakeside.',
          imageUrl: 'https://images.unsplash.com/sample-park.jpg',
          isPinned: false,
          isAnonymous: false,
          upvotesCount: 15,
          repliesCount: 1,
          status: 'active',
          isEdited: false,
          createdAt: '2026-10-13T10:00:00Z',
          updatedAt: '2026-10-13T10:00:00Z',
        },
        {
          id: 'post-4',
          authorId: 'user-vikram',
          authorName: 'Vikram Naidu',
          authorPrecinct: 'Denai Alam',
          authorRole: 'resident',
          authorVerified: true,
          category: 'complaint',
          title: 'Truck Blocking Fire Hydrant',
          content: 'Commercial truck parked at Jalan Denai 2/1 blocking access.',
          isPinned: false,
          isAnonymous: false,
          upvotesCount: 6,
          repliesCount: 0,
          status: 'active',
          isEdited: false,
          createdAt: '2026-10-12T14:20:00Z',
          updatedAt: '2026-10-12T14:20:00Z',
        },
      ];

      this.comments = {
        'post-1': [
          {
            id: 'reply-1',
            postId: 'post-1',
            authorId: 'user-nurul',
            authorName: 'Nurul Huda',
            authorPrecinct: 'Elmina Green 3',
            authorRole: 'resident',
            authorVerified: true,
            content: 'Thank you for the notice Capt Azman. Will the jogging track stay open?',
            isOfficialResponse: false,
            isEdited: false,
            createdAt: '2026-10-15T09:00:00Z',
          },
          {
            id: 'reply-2',
            postId: 'post-1',
            authorId: 'user-azman',
            authorName: 'Capt. (R) Azman Salleh',
            authorPrecinct: 'Township Management',
            authorRole: 'management',
            authorVerified: true,
            content: 'Yes, jogging path remains accessible throughout the day.',
            isOfficialResponse: true,
            isEdited: false,
            createdAt: '2026-10-15T09:15:00Z',
          },
        ],
        'post-3': [
          {
            id: 'reply-3',
            postId: 'post-3',
            authorId: 'user-vikram',
            authorName: 'Vikram Naidu',
            authorPrecinct: 'Denai Alam',
            authorRole: 'resident',
            authorVerified: true,
            content: 'I will be there with my gardening tools!',
            isOfficialResponse: false,
            isEdited: false,
            createdAt: '2026-10-13T11:00:00Z',
          },
        ],
        'post-4': [],
      };

      this.auditLogs = [];
    }

    logAudit(actor: UserProfile, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
      const log: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        action,
        targetType,
        targetId,
        details,
        createdAt: new Date().toISOString(),
      };
      this.auditLogs.unshift(log);
    }

    // Attempting to edit a post: strictly disabled / forbidden
    editPost(_actor: UserProfile, _postId: string, _data: { title: string; content: string; imageUrl?: string }): { success: boolean; error?: string } {
      return { 
        success: false, 
        error: 'Edit functionality has been removed. Residents can only delete their own posts.' 
      };
    }

    deletePost(actor: UserProfile, postId: string, reason?: string): { success: boolean; error?: string } {
      const postIndex = this.posts.findIndex((p) => p.id === postId);
      if (postIndex === -1) return { success: false, error: 'Post not found.' };

      const post = this.posts[postIndex];
      const isOwner = post.authorId === actor.id;
      const isManagement = actor.role === 'management';

      // Enforce: only author or management can delete
      if (!isOwner && !isManagement) {
        return {
          success: false,
          error: 'Access denied: Only the author or township management can delete this post.',
        };
      }

      const moderationReason = reason || (isManagement && !isOwner ? 'Removed by Management Moderation' : 'Deleted by author');

      // Soft delete / remove from public view
      this.posts.splice(postIndex, 1);

      // Cascade associated comments cleanup
      delete this.comments[postId];

      const auditAction = isManagement && !isOwner ? 'MODERATE_DELETE_POST' : 'DELETE_OWN_POST';
      this.logAudit(actor, auditAction, 'community_posts', postId, {
        postTitle: post.title,
        authorId: post.authorId,
        reason: moderationReason,
        isManagement,
      });

      return { success: true };
    }

    // Attempting to edit a reply: strictly disabled / forbidden
    editReply(_actor: UserProfile, _commentId: string, _content: string): { success: boolean; error?: string } {
      return { 
        success: false, 
        error: 'Edit functionality has been removed. Residents can only delete their own comments.' 
      };
    }

    deleteReply(actor: UserProfile, commentId: string, reason?: string): { success: boolean; error?: string } {
      let targetPostId: string | null = null;
      let targetReply: PostReply | null = null;

      for (const [postId, replyList] of Object.entries(this.comments)) {
        const match = replyList.find((r) => r.id === commentId);
        if (match) {
          targetPostId = postId;
          targetReply = match;
          break;
        }
      }

      if (!targetReply || !targetPostId) return { success: false, error: 'Comment not found.' };

      const isOwner = targetReply.authorId === actor.id;
      const isManagement = actor.role === 'management';

      // Enforce: only author or management can delete
      if (!isOwner && !isManagement) {
        return {
          success: false,
          error: 'Access denied: Only the author or township management can delete this comment.',
        };
      }

      const moderationReason = reason || (isManagement && !isOwner ? 'Removed by Management Moderation' : 'Deleted by author');

      // Remove from comments list
      this.comments[targetPostId] = this.comments[targetPostId].filter((r) => r.id !== commentId);

      // Decrement parent post replies count
      const parentPost = this.posts.find((p) => p.id === targetPostId);
      if (parentPost) {
        parentPost.repliesCount = Math.max(0, (parentPost.repliesCount || 1) - 1);
      }

      const auditAction = isManagement && !isOwner ? 'MODERATE_DELETE_COMMENT' : 'DELETE_OWN_COMMENT';
      this.logAudit(actor, auditAction, 'comments', commentId, {
        postId: targetPostId,
        authorId: targetReply.authorId,
        reason: moderationReason,
        isManagement,
      });

      return { success: true };
    }
  }

  // --- 1. REMOVE EDIT POST PERMISSION TESTS ---

  it('1. Edit disabled: Resident 1 (Nurul) cannot edit their own post', () => {
    const feed = new FeedModerationState();
    const result = feed.editPost(RESIDENT_1, 'post-3', {
      title: 'Tampered Title',
      content: 'Tampered Content',
    });

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Edit functionality has been removed/);
    // Post remains unchanged in state
    const post = feed.posts.find((p) => p.id === 'post-3');
    assert.strictEqual(post?.title, 'Community Gotong-Royong 2026');
  });

  it('2. Edit disabled: Resident 2 (Vikram) cannot edit their own post', () => {
    const feed = new FeedModerationState();
    const result = feed.editPost(RESIDENT_2, 'post-4', {
      title: 'Updated Hydrant Title',
      content: 'Updated Content',
    });

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Edit functionality has been removed/);
  });

  it('3. Edit disabled: Resident 1 cannot edit Resident 2 post', () => {
    const feed = new FeedModerationState();
    const result = feed.editPost(RESIDENT_1, 'post-4', {
      title: 'Unauthorized Edit Attempt',
      content: 'Hacked',
    });

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Edit functionality has been removed/);
  });

  // --- 2. POST DELETION PERMISSIONS TESTS ---

  it('4. Owner permission: Resident 1 (Nurul) can delete their own post', () => {
    const feed = new FeedModerationState();
    const result = feed.deletePost(RESIDENT_1, 'post-3');

    assert.strictEqual(result.success, true);
    assert.strictEqual(feed.posts.find((p) => p.id === 'post-3'), undefined);

    // Audit log records owner deletion
    assert.strictEqual(feed.auditLogs[0].action, 'DELETE_OWN_POST');
    assert.strictEqual(feed.auditLogs[0].actorId, RESIDENT_1.id);
  });

  it('5. Security: Resident 1 (Nurul) cannot delete Resident 2 (Vikram) post', () => {
    const feed = new FeedModerationState();
    const result = feed.deletePost(RESIDENT_1, 'post-4');

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Access denied: Only the author or township management can delete this post/);
    assert.ok(feed.posts.find((p) => p.id === 'post-4'));
  });

  it('6. Security: Resident 2 (Vikram) cannot delete Resident 1 (Nurul) post', () => {
    const feed = new FeedModerationState();
    const result = feed.deletePost(RESIDENT_2, 'post-3');

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Access denied: Only the author or township management can delete this post/);
    assert.ok(feed.posts.find((p) => p.id === 'post-3'));
  });

  it('7. Management moderation: Management (Capt Azman) can delete Resident 1 and Resident 2 posts with moderation audit log', () => {
    const feed = new FeedModerationState();
    
    // Delete Resident 2 post
    const result1 = feed.deletePost(MANAGEMENT_USER, 'post-4', 'Resolved on-site by towing contractor');
    assert.strictEqual(result1.success, true);
    assert.strictEqual(feed.posts.find((p) => p.id === 'post-4'), undefined);
    assert.strictEqual(feed.auditLogs[0].action, 'MODERATE_DELETE_POST');
    assert.strictEqual(feed.auditLogs[0].actorId, MANAGEMENT_USER.id);
    assert.strictEqual((feed.auditLogs[0].details as Record<string, unknown>)?.reason, 'Resolved on-site by towing contractor');

    // Delete Resident 1 post
    const result2 = feed.deletePost(MANAGEMENT_USER, 'post-3', 'Event cancelled by organizing committee');
    assert.strictEqual(result2.success, true);
    assert.strictEqual(feed.posts.find((p) => p.id === 'post-3'), undefined);
    assert.strictEqual(feed.auditLogs[0].action, 'MODERATE_DELETE_POST');
  });

  it('8. Deletion consistency: Deleting a post removes all associated replies', () => {
    const feed = new FeedModerationState();
    assert.strictEqual((feed.comments['post-3'] || []).length, 1);

    const result = feed.deletePost(RESIDENT_1, 'post-3');
    assert.strictEqual(result.success, true);
    assert.strictEqual(feed.comments['post-3'], undefined);
  });

  // --- 3. COMMENT MANAGEMENT & MODERATION TESTS ---

  it('9. Edit disabled: Resident 1 (Nurul) cannot edit their own comment', () => {
    const feed = new FeedModerationState();
    const result = feed.editReply(RESIDENT_1, 'reply-1', 'Attempt to edit comment text');

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Edit functionality has been removed/);
    const reply = feed.comments['post-1'].find((r) => r.id === 'reply-1');
    assert.strictEqual(reply?.content, 'Thank you for the notice Capt Azman. Will the jogging track stay open?');
  });

  it('10. Owner permission: Resident 1 can delete their own comment and repliesCount decrements', () => {
    const feed = new FeedModerationState();
    const initialCount = feed.posts.find((p) => p.id === 'post-1')?.repliesCount || 0;

    const result = feed.deleteReply(RESIDENT_1, 'reply-1');
    assert.strictEqual(result.success, true);

    const post1Replies = feed.comments['post-1'];
    assert.strictEqual(post1Replies.find((r) => r.id === 'reply-1'), undefined);

    const post1 = feed.posts.find((p) => p.id === 'post-1');
    assert.strictEqual(post1?.repliesCount, initialCount - 1);

    // Audit log
    assert.strictEqual(feed.auditLogs[0].action, 'DELETE_OWN_COMMENT');
    assert.strictEqual(feed.auditLogs[0].actorId, RESIDENT_1.id);
  });

  it('11. Security: Resident 1 cannot delete Resident 2 comment', () => {
    const feed = new FeedModerationState();
    const result = feed.deleteReply(RESIDENT_1, 'reply-3');

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Access denied: Only the author or township management can delete this comment/);

    const post3Replies = feed.comments['post-3'];
    assert.ok(post3Replies.find((r) => r.id === 'reply-3'));
  });

  it('12. Security: Resident 2 cannot delete Resident 1 comment', () => {
    const feed = new FeedModerationState();
    const result = feed.deleteReply(RESIDENT_2, 'reply-1');

    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /Access denied: Only the author or township management can delete this comment/);

    const post1Replies = feed.comments['post-1'];
    assert.ok(post1Replies.find((r) => r.id === 'reply-1'));
  });

  it('13. Management moderation: Management can delete any resident comment with audit log', () => {
    const feed = new FeedModerationState();
    const initialCount = feed.posts.find((p) => p.id === 'post-3')?.repliesCount || 0;

    const result = feed.deleteReply(MANAGEMENT_USER, 'reply-3', 'Inappropriate or off-topic remark');
    assert.strictEqual(result.success, true);

    const post3Replies = feed.comments['post-3'];
    assert.strictEqual(post3Replies.find((r) => r.id === 'reply-3'), undefined);

    const post3 = feed.posts.find((p) => p.id === 'post-3');
    assert.strictEqual(post3?.repliesCount, initialCount - 1);

    // Audit log records moderation action and reason
    assert.strictEqual(feed.auditLogs[0].action, 'MODERATE_DELETE_COMMENT');
    assert.strictEqual(feed.auditLogs[0].actorId, MANAGEMENT_USER.id);
    assert.strictEqual((feed.auditLogs[0].details as Record<string, unknown>)?.reason, 'Inappropriate or off-topic remark');
  });
});
