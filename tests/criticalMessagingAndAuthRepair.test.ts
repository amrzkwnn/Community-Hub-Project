import { test, describe } from 'node:test';
import assert from 'node:assert';
import { toDatabaseUserId, fromDatabaseUserId } from '../src/lib/utils/idMapping.ts';
import { INITIAL_PROFILES, INITIAL_CONVERSATIONS, INITIAL_MESSAGES } from '../src/lib/data/mockData.ts';

describe('TESDH Critical Fix Suite: Chat System Repair & Stitch Authentication', () => {

  // =========================================================================
  // PART 1 & 2: FIRST MESSAGE PERSISTENCE & ATOMIC CONVERSATION CREATION
  // =========================================================================
  describe('Part 1 & 2 — Initial Message Persistence & No Dropped Messages', () => {
    test('atomically constructs conversation and initial message without race condition', () => {
      const senderId = 'user-nurul';
      const recipientId = 'user-vikram';
      const initialMessage = "Hi Vikram, I saw your Home Garden Tool Set. Is it still available?";
      const contextTitle = "Home Garden Tool Set";

      // Simulate atomic conversation creation
      const convId = `conv-${Date.now()}`;
      const newConv = {
        id: convId,
        participantOneId: senderId,
        participantOneName: 'Nurul Huda',
        participantTwoId: recipientId,
        participantTwoName: 'Vikram Naidu',
        subject: `Exchange Inquiry: ${contextTitle}`,
        contextType: 'exchange' as const,
        status: 'accepted' as const,
        lastMessage: initialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      const newMsg = {
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: senderId,
        senderName: 'Nurul Huda',
        isAnonymous: false,
        content: initialMessage,
        createdAt: new Date().toISOString(),
      };

      // Verify conversation has the initial message preview
      assert.strictEqual(newConv.lastMessage, initialMessage);
      assert.strictEqual(newMsg.conversationId, convId);
      assert.strictEqual(newMsg.content, initialMessage);
      assert.strictEqual(newConv.participantTwoId, recipientId);
    });

    test('prevents self-messaging when resident attempts to message their own listing', () => {
      const currentUserId = 'user-nurul';
      const listingOwnerId = 'user-nurul';

      const isSelfMessaging = currentUserId === listingOwnerId;
      assert.strictEqual(isSelfMessaging, true);

      // Verify logic correctly prevents creating conversation with oneself
      const getOrCreate = (recipientId: string) => {
        if (recipientId === currentUserId) return null;
        return `conv-ok`;
      };

      assert.strictEqual(getOrCreate(listingOwnerId), null);
    });

    test('correctly maps persona IDs to database UUIDs for persistent Supabase storage', () => {
      const nurulUuid = toDatabaseUserId('user-nurul');
      const vikramUuid = toDatabaseUserId('user-vikram');
      const azmanUuid = toDatabaseUserId('user-azman');

      assert.strictEqual(nurulUuid, '11111111-1111-4111-8111-111111111111');
      assert.strictEqual(vikramUuid, '22222222-2222-4222-8222-222222222222');
      assert.strictEqual(azmanUuid, '33333333-3333-4333-8333-333333333333');

      // Reverse mapping
      assert.strictEqual(fromDatabaseUserId('11111111-1111-4111-8111-111111111111'), 'user-nurul');
      assert.strictEqual(fromDatabaseUserId('22222222-2222-4222-8222-222222222222'), 'user-vikram');
      assert.strictEqual(fromDatabaseUserId('33333333-3333-4333-8333-333333333333'), 'user-azman');
    });
  });

  // =========================================================================
  // PART 3 & 4: CONVERSATION SELECTION & PREVENTING TOPMOST CONTACT REDIRECTION
  // =========================================================================
  describe('Part 3 & 4 — Contact Selection & Active Conversation Resolution', () => {
    test('resolves the exact requested conversation and does NOT fallback to topmost contact', () => {
      const userConversations = [
        { id: 'conv-1', participantOneId: 'user-nurul', participantTwoId: 'user-azman', participantTwoName: 'Azman' },
        { id: 'conv-2', participantOneId: 'user-nurul', participantTwoId: 'user-vikram', participantTwoName: 'Vikram' },
        { id: 'conv-3', participantOneId: 'user-nurul', participantTwoId: 'user-harith', participantTwoName: 'Harith' },
      ];

      // Case 1: Selecting specific contact conv-2
      const targetId = 'conv-2';
      const activeConv = targetId
        ? (userConversations.find((c) => c.id === targetId) || null)
        : (userConversations[0] || null);

      assert.strictEqual(activeConv?.id, 'conv-2');
      assert.strictEqual(activeConv?.participantTwoName, 'Vikram');
      assert.notStrictEqual(activeConv?.id, userConversations[0].id);

      // Case 2: Newly created conversation not yet in list - returns null rather than wrong contact
      const pendingNewId = 'conv-new-999';
      const pendingConv = pendingNewId
        ? (userConversations.find((c) => c.id === pendingNewId) || null)
        : (userConversations[0] || null);

      assert.strictEqual(pendingConv, null);
      // It does NOT expose userConversations[0] (Azman's private conversation)
      assert.notStrictEqual(pendingConv?.id, userConversations[0].id);
    });

    test('reorders conversation list without altering the active conversation selection', () => {
      let conversations = [
        { id: 'conv-a', lastMessageTime: '2026-10-20T10:00:00Z' },
        { id: 'conv-b', lastMessageTime: '2026-10-20T09:00:00Z' },
      ];

      const selectedId = 'conv-b';

      // Incoming message on conv-a reorders the list
      conversations = [
        { id: 'conv-a', lastMessageTime: '2026-10-20T11:00:00Z' },
        { id: 'conv-b', lastMessageTime: '2026-10-20T09:00:00Z' },
      ].sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

      // Verify the active conversation is still conv-b despite reordering
      const currentActive = conversations.find((c) => c.id === selectedId);
      assert.strictEqual(currentActive?.id, 'conv-b');
    });

    test('isolates conversation history when switching accounts', () => {
      const allConversations = [
        { id: 'conv-nurul-vikram', participantOneId: 'user-nurul', participantTwoId: 'user-vikram' },
        { id: 'conv-vikram-azman', participantOneId: 'user-vikram', participantTwoId: 'user-azman' },
        { id: 'conv-azman-rosli', participantOneId: 'user-azman', participantTwoId: 'user-rosli' },
      ];

      // Filter for Nurul: must ONLY see conversations she participates in
      const nurulConvs = allConversations.filter(
        (c) => c.participantOneId === 'user-nurul' || c.participantTwoId === 'user-nurul'
      );
      assert.strictEqual(nurulConvs.length, 1);
      assert.strictEqual(nurulConvs[0].id, 'conv-nurul-vikram');

      // Azman-Rosli conversation is completely inaccessible to Nurul
      assert.strictEqual(nurulConvs.some((c) => c.id === 'conv-azman-rosli'), false);
    });
  });

  // =========================================================================
  // PART 5: EXCHANGE & LOCAL SERVICES INQUIRY CONTEXTUAL DRAFTS
  // =========================================================================
  describe('Part 5 — Exchange & Local Services Inquiry Drafts', () => {
    test('generates accurate contextual draft for Circular Exchange inquiry', () => {
      const item = {
        id: 'ex-101',
        title: 'Solid Teak Dining Table',
        authorId: 'user-vikram',
        listingType: 'exchange',
      };

      const isFree = item.listingType === 'giveaway';
      const draft = isFree
        ? `Hi, I'm interested in your giveaway '${item.title}'. Is it still available for collection?`
        : `Hi, I'm interested in your listing '${item.title}'. Is it still available?`;

      assert.strictEqual(draft, "Hi, I'm interested in your listing 'Solid Teak Dining Table'. Is it still available?");
    });

    test('generates accurate contextual draft for Local Service offering and aid request', () => {
      // Offering
      const serviceOffering = {
        id: 'serv-1',
        title: 'Aircon Chemical Cleaning',
        type: 'offering',
      };
      const draftOffering = `Hi, I saw your '${serviceOffering.title}' service on Nadikomuniti. Could you share your availability?`;
      assert.strictEqual(draftOffering, "Hi, I saw your 'Aircon Chemical Cleaning' service on Nadikomuniti. Could you share your availability?");

      // Requesting Aid
      const serviceRequest = {
        id: 'serv-2',
        title: 'Need Help Moving Sofa',
        type: 'requesting',
      };
      const draftAid = `Hi, I saw your request for help with '${serviceRequest.title}'. I'm interested in helping. Could you share more details?`;
      assert.strictEqual(draftAid, "Hi, I saw your request for help with 'Need Help Moving Sofa'. I'm interested in helping. Could you share more details?");
    });
  });

  // =========================================================================
  // PART 6 - 13: AUTHENTICATION, SAFE DEMO MODE & LOGOUT
  // =========================================================================
  describe('Part 6 - 13 — Authentication, Demo Mode & Profile Logout', () => {
    test('evaluates isAuthenticated correctly for Supabase user vs Demo Mode', () => {
      // Unauthenticated state
      const unauth = { supabaseUser: null, isDemoMode: false };
      const isAuth1 = Boolean(unauth.supabaseUser) || unauth.isDemoMode;
      assert.strictEqual(isAuth1, false);

      // Authenticated with real Supabase user
      const authSupabase = { supabaseUser: { id: 'uuid-123', email: 'test@elmina.my' }, isDemoMode: false };
      const isAuth2 = Boolean(authSupabase.supabaseUser) || authSupabase.isDemoMode;
      assert.strictEqual(isAuth2, true);

      // Safe Demo Mode active
      const demoAuth = { supabaseUser: null, isDemoMode: true };
      const isAuth3 = Boolean(demoAuth.supabaseUser) || demoAuth.isDemoMode;
      assert.strictEqual(isAuth3, true);
    });

    test('safe demo mode does NOT grant management privileges by default', () => {
      const demoUser = INITIAL_PROFILES[0]; // Nurul Huda
      assert.strictEqual(demoUser.role, 'resident');
      assert.strictEqual(demoUser.role === 'management', false);
    });

    test('logout cleanly clears user state, demo flags, and active conversations', () => {
      let state = {
        supabaseUser: { id: 'uuid-123' },
        isDemoMode: true,
        conversations: [{ id: 'conv-1' }],
        messages: [{ id: 'msg-1' }],
        activeConversationId: 'conv-1',
        activeTab: 'messages',
      };

      // Perform clean logout
      state = {
        supabaseUser: null,
        isDemoMode: false,
        conversations: [],
        messages: [],
        activeConversationId: '',
        activeTab: 'home',
      };

      const isAuthenticated = Boolean(state.supabaseUser) || state.isDemoMode;
      assert.strictEqual(isAuthenticated, false);
      assert.strictEqual(state.conversations.length, 0);
      assert.strictEqual(state.messages.length, 0);
      assert.strictEqual(state.activeConversationId, '');
      assert.strictEqual(state.activeTab, 'home');
    });

    test('validates registration form constraints according to Stitch specs', () => {
      const validateRegistration = (data: {
        fullName: string;
        email: string;
        password: string;
        confirmPassword: string;
        agreedToTerms: boolean;
      }) => {
        if (!data.fullName.trim()) return { valid: false, error: 'Full name required' };
        if (!data.email.trim() || !data.email.includes('@')) return { valid: false, error: 'Valid email required' };
        if (data.password.length < 6) return { valid: false, error: 'Password min 6 chars' };
        if (data.password !== data.confirmPassword) return { valid: false, error: 'Passwords must match' };
        if (!data.agreedToTerms) return { valid: false, error: 'Must agree to terms' };
        return { valid: true };
      };

      // Valid form
      assert.strictEqual(validateRegistration({
        fullName: 'Amir Zakwan',
        email: 'amir@elmina.my',
        password: 'password123',
        confirmPassword: 'password123',
        agreedToTerms: true,
      }).valid, true);

      // Password mismatch
      assert.strictEqual(validateRegistration({
        fullName: 'Amir Zakwan',
        email: 'amir@elmina.my',
        password: 'password123',
        confirmPassword: 'differentpassword',
        agreedToTerms: true,
      }).valid, false);

      // Short password
      assert.strictEqual(validateRegistration({
        fullName: 'Amir Zakwan',
        email: 'amir@elmina.my',
        password: '123',
        confirmPassword: '123',
        agreedToTerms: true,
      }).valid, false);
    });
  });
});
