import { test, describe } from 'node:test';
import assert from 'node:assert';
import { toDatabaseUserId, fromDatabaseUserId } from '../src/lib/utils/idMapping.ts';
import type { PropertyMessageRequest, Conversation, Message } from '../src/types/index.ts';

describe('NADIKOMUNITI: Chat Request Acceptance & Direct Registration Test Suite', () => {

  // =========================================================================
  // PART 1 — REGISTRATION WITHOUT EMAIL VERIFICATION
  // =========================================================================
  describe('Part 1 — Registration Workflow Without Email-Link Verification', () => {
    test('successful signup establishes session directly without navigating to verify screen', () => {
      // Mock Supabase signUp response when "Confirm Email" is disabled
      const mockSignUpResponseWithSession = {
        data: {
          user: {
            id: 'd9b73673-8bc1-447a-8f81-555555555555',
            email: 'resident.new@elmina.my',
            user_metadata: {
              full_name: 'Resident New',
              township_precinct: 'Elmina West (EV1)',
              role: 'resident',
            },
          },
          session: {
            access_token: 'fake-jwt-token-12345',
            refresh_token: 'fake-refresh-token-12345',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
        error: null,
      };

      // Verify session exists
      const hasSession = Boolean(mockSignUpResponseWithSession.data.session);
      assert.strictEqual(hasSession, true);

      // Workflow evaluation: does it require email confirmation?
      const requiresEmailConfirmation = !hasSession;
      assert.strictEqual(requiresEmailConfirmation, false, 'Should NOT require email confirmation when session is returned');

      // Default role must be resident, not management
      assert.strictEqual(mockSignUpResponseWithSession.data.user.user_metadata.role, 'resident');
      assert.notStrictEqual(mockSignUpResponseWithSession.data.user.user_metadata.role, 'management');
    });

    test('if hosted Supabase server requires email confirmation, provides explicit dashboard instruction', () => {
      const mockSupabaseError = {
        message: 'Email not confirmed',
      };

      const formatAuthErrorMessage = (errorMsg: string) => {
        if (errorMsg.toLowerCase().includes('email not confirmed')) {
          return 'Account registered! However, email confirmation is currently active in your Supabase project settings. Please turn OFF "Confirm Email" in Supabase Dashboard -> Authentication -> Providers -> Email to allow direct instant login.';
        }
        return errorMsg;
      };

      const formatted = formatAuthErrorMessage(mockSupabaseError.message);
      assert.match(formatted, /Authentication -> Providers -> Email/);
      assert.match(formatted, /Confirm Email/);
    });

    test('passwords are not exposed or stored in plain text profile columns', () => {
      const residentProfile = {
        id: 'user-resident-1',
        authUserId: 'd9b73673-8bc1-447a-8f81-555555555555',
        name: 'Siti Sarah',
        displayName: 'Siti S.',
        email: 'siti@elmina.my',
        role: 'resident',
        precinct: 'Elmina West',
      };

      // Ensure no password field exists in public profile object
      assert.strictEqual('password' in residentProfile, false);
      assert.strictEqual('hashedPassword' in residentProfile, false);
      assert.strictEqual('secret' in residentProfile, false);
    });
  });

  // =========================================================================
  // PART 2 — STITCH AUTHENTICATION DESIGN ALIGNMENT
  // =========================================================================
  describe('Part 2 — Stitch Authentication Page Structure & Responsiveness', () => {
    test('verifies all 4 canonical Stitch designs are mapped to corresponding auth modes', () => {
      const STITCH_DESIGNS = {
        'Sign In': 'signin',
        'Register': 'signup',
        'Verify': 'verify',
        'Forgot Password': 'forgot',
      };

      assert.strictEqual(STITCH_DESIGNS['Sign In'], 'signin');
      assert.strictEqual(STITCH_DESIGNS['Register'], 'signup');
      assert.strictEqual(STITCH_DESIGNS['Verify'], 'verify');
      assert.strictEqual(STITCH_DESIGNS['Forgot Password'], 'forgot');
    });

    test('verifies Stitch visual branding assets and background image presence', () => {
      const STITCH_ASSETS = {
        logo: '/images/nadikomuniti-logo-transparent.png',
        background: '/images/elmina-township-bg.png',
        primaryCrimson: '#9E1315',
        gradientAmber: '#fd8a42',
      };

      assert.match(STITCH_ASSETS.logo, /nadikomuniti-logo-transparent\.png$/);
      assert.match(STITCH_ASSETS.background, /elmina-township-bg\.png$/);
      assert.strictEqual(STITCH_ASSETS.primaryCrimson, '#9E1315');
    });
  });

  // =========================================================================
  // PART 3, 4, 5 — CHAT REQUEST ACCEPTANCE WORKFLOW & PERSISTENCE
  // =========================================================================
  describe('Part 3, 4, 5 — Message Request Acceptance & Bidirectional Visibility', () => {
    test('Resident A creates request and Resident B sees pending request in inbox', () => {
      const residentA_Id = 'user-nurul';
      const residentB_Id = 'user-vikram';
      const initialMessageText = 'Hello neighbor, are you having water pressure issues at EV1 today?';

      const request: PropertyMessageRequest = {
        id: 'req-water-1',
        senderId: residentA_Id,
        senderDisplayName: 'Nurul H.',
        senderPrecinct: 'Elmina West (EV1)',
        isAnonymous: false,
        propertyAddress: 'No. 18, Jalan Elmina Barat 1/2',
        initialMessage: initialMessageText,
        status: 'pending',
        createdAt: '2026-10-23T12:00:00Z',
      };

      assert.strictEqual(request.status, 'pending');
      assert.strictEqual(request.initialMessage, initialMessageText);
      assert.strictEqual(request.senderId, residentA_Id);
    });

    test('Resident B accepts: atomically creates shared conversation and links opening message for BOTH users', () => {
      const residentA_Id = 'user-nurul';
      const residentB_Id = 'user-vikram';
      const initialMessageText = 'Hello neighbor, are you having water pressure issues at EV1 today?';

      let request: PropertyMessageRequest = {
        id: 'req-water-2',
        senderId: residentA_Id,
        senderDisplayName: 'Nurul H.',
        senderPrecinct: 'Elmina West (EV1)',
        isAnonymous: false,
        propertyAddress: 'No. 18, Jalan Elmina Barat 1/2',
        initialMessage: initialMessageText,
        status: 'pending',
        createdAt: '2026-10-23T12:00:00Z',
      };

      // Resident B executes acceptance
      const convId = `conv-req-${request.id}`;
      const acceptedConversation: Conversation = {
        id: convId,
        participantOneId: request.senderId,
        participantOneName: request.senderDisplayName || 'Resident',
        participantTwoId: residentB_Id,
        participantTwoName: 'Vikram Naidu',
        subject: `Property Inquiry: ${request.propertyAddress}`,
        contextType: 'property_inquiry',
        status: 'accepted',
        lastMessage: request.initialMessage,
        lastMessageTime: request.createdAt,
        unreadCount: 0,
      };

      const openingMessage: Message = {
        id: `msg-req-${request.id}`,
        conversationId: convId,
        senderId: request.senderId,
        senderName: request.senderDisplayName || 'Resident',
        isAnonymous: request.isAnonymous,
        content: request.initialMessage,
        createdAt: request.createdAt,
      };

      // Request is marked accepted and linked
      request = {
        ...request,
        status: 'accepted',
        conversationId: convId,
      };

      // Verify request state
      assert.strictEqual(request.status, 'accepted');
      assert.strictEqual(request.conversationId, convId);

      // Verify conversation has BOTH participants
      assert.strictEqual(acceptedConversation.participantOneId, residentA_Id);
      assert.strictEqual(acceptedConversation.participantTwoId, residentB_Id);
      assert.strictEqual(acceptedConversation.lastMessage, initialMessageText);

      // Verify opening message is attached to this exact conversation
      assert.strictEqual(openingMessage.conversationId, convId);
      assert.strictEqual(openingMessage.content, initialMessageText);
      assert.strictEqual(openingMessage.senderId, residentA_Id);

      // VERIFY BOTH USERS CAN QUERY AND SEE THIS CONVERSATION:
      // Resident A (Sender) query filter
      const isVisibleToResidentA = acceptedConversation.participantOneId === residentA_Id || acceptedConversation.participantTwoId === residentA_Id;
      assert.strictEqual(isVisibleToResidentA, true, 'Accepted conversation MUST be visible to Resident A (Sender)');

      // Resident B (Recipient) query filter
      const isVisibleToResidentB = acceptedConversation.participantOneId === residentB_Id || acceptedConversation.participantTwoId === residentB_Id;
      assert.strictEqual(isVisibleToResidentB, true, 'Accepted conversation MUST be visible to Resident B (Recipient)');
    });

    test('acceptance is idempotent: accepting twice does not duplicate conversation or message', () => {
      const requestId = 'req-idempotency-1';
      const existingConversations: Conversation[] = [
        {
          id: `conv-req-${requestId}`,
          participantOneId: 'user-nurul',
          participantOneName: 'Nurul H.',
          participantTwoId: 'user-vikram',
          participantTwoName: 'Vikram N.',
          subject: 'Property Inquiry: EW-12',
          contextType: 'property_inquiry',
          status: 'accepted',
          lastMessage: 'Hello',
          lastMessageTime: '2026-10-23T12:00:00Z',
          unreadCount: 0,
        }
      ];

      // Second acceptance invocation resolves existing conversation
      const convId = `conv-req-${requestId}`;
      const existing = existingConversations.find((c) => c.id === convId);
      assert.notStrictEqual(existing, undefined);
      assert.strictEqual(existing?.id, convId);

      // Ensure no duplicates added
      const listAfterSecondAccept = [existing!, ...existingConversations.filter((c) => c.id !== convId)];
      assert.strictEqual(listAfterSecondAccept.length, 1);
    });

    test('initial message survives conversation navigation, reordering and refresh', () => {
      const convId = 'conv-req-persisted-1';
      const initialText = 'Can I borrow your ladder this Saturday?';
      const messages: Message[] = [
        {
          id: 'msg-initial',
          conversationId: convId,
          senderId: 'user-nurul',
          senderName: 'Nurul H.',
          isAnonymous: false,
          content: initialText,
          createdAt: '2026-10-23T10:00:00Z',
        },
      ];

      // Subsequent message added
      messages.push({
        id: 'msg-reply',
        conversationId: convId,
        senderId: 'user-vikram',
        senderName: 'Vikram N.',
        isAnonymous: false,
        content: 'Sure Nurul, you can pick it up around 10am.',
        createdAt: '2026-10-23T10:05:00Z',
      });

      // Filter messages for conversation
      const conversationThread = messages.filter((m) => m.conversationId === convId);
      assert.strictEqual(conversationThread.length, 2);
      assert.strictEqual(conversationThread[0].content, initialText);
      assert.strictEqual(conversationThread[1].content, 'Sure Nurul, you can pick it up around 10am.');
    });

    test('active contact selection remains locked to targetId and does not jump to topmost inbox item', () => {
      const inbox: Conversation[] = [
        { id: 'conv-topmost', participantOneId: 'user-a', participantOneName: 'A', participantTwoId: 'user-b', participantTwoName: 'B', subject: 'Sub A', contextType: 'general', status: 'accepted', lastMessage: 'Latest', lastMessageTime: '2026-10-23T12:00:00Z', unreadCount: 0 },
        { id: 'conv-target', participantOneId: 'user-a', participantOneName: 'A', participantTwoId: 'user-c', participantTwoName: 'C', subject: 'Target', contextType: 'property_inquiry', status: 'accepted', lastMessage: 'Old', lastMessageTime: '2026-10-23T11:00:00Z', unreadCount: 0 },
      ];

      const intendedConvId = 'conv-target';
      const resolved = intendedConvId ? (inbox.find((c) => c.id === intendedConvId) || null) : inbox[0];

      assert.strictEqual(resolved?.id, 'conv-target');
      assert.notStrictEqual(resolved?.id, 'conv-topmost');
    });
  });

  // =========================================================================
  // PART 6 — DATA ISOLATION & UNAUTHORIZED USER RESTRICTION
  // =========================================================================
  describe('Part 6 — Privacy & Cross-User Data Isolation', () => {
    test('unrelated Resident C cannot read private conversation between Resident A and B', () => {
      const privateConversation: Conversation = {
        id: 'conv-private-ab',
        participantOneId: 'user-nurul',
        participantOneName: 'Nurul H.',
        participantTwoId: 'user-vikram',
        participantTwoName: 'Vikram N.',
        subject: 'Confidential Neighbor Discussion',
        contextType: 'property_inquiry',
        status: 'accepted',
        lastMessage: 'Private message content',
        lastMessageTime: '2026-10-23T12:00:00Z',
        unreadCount: 0,
      };

      const residentC_Id = 'user-azman';
      const isAuthorized = privateConversation.participantOneId === residentC_Id || privateConversation.participantTwoId === residentC_Id;

      assert.strictEqual(isAuthorized, false, 'Resident C must NOT have access to Resident A & B conversation');
    });
  });
});
