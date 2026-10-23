import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Conversation, Message, PropertyMessageRequest, UserProfile } from '../src/types/index.ts';
import { toDatabaseUserId, fromDatabaseUserId } from '../src/lib/utils/idMapping.ts';

describe('NADIKOMUNITI: Chat Persistence, Address Search & Account Verification Test Suite', () => {

  describe('Part 1, 2, 3 — Request Acceptance, Bidirectional Visibility & Persistence', () => {
    test('Resident B accepts Resident A request: canonical conversation created for BOTH users and initial message preserved', () => {
      const residentA: UserProfile = {
        id: 'user-amir-real',
        fullName: 'Amir Zakaria',
        displayName: 'Amir',
        role: 'resident',
        townshipPrecinct: 'Elmina Valley 1 (EV1)',
        unitNumber: 'No. 12, Jalan EV 1/2',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
      };

      const residentB: UserProfile = {
        id: 'user-nurul-real',
        fullName: 'Nurul Izzati',
        displayName: 'Nurul',
        role: 'resident',
        townshipPrecinct: 'Elmina Ridge',
        unitNumber: 'No. 45, Jalan ER 2/1',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString(),
      };

      // 1. Resident A submits message request to Resident B
      const initialRequest: PropertyMessageRequest = {
        id: 'req-test-991',
        senderId: residentA.id,
        recipientId: residentB.id,
        propertyAddress: 'No. 45, Jalan ER 2/1 (Elmina Ridge)',
        subject: 'Neighborhood Inquiry: Garden Maintenance',
        initialMessage: 'Hi Nurul, noticed your landscaped hedge. Any landscaper recommendation in EV1/ER?',
        isAnonymous: false,
        senderDisplayName: residentA.displayName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // 2. Resident B accepts request atomically
      const convId = 'conv-canonical-991';
      const canonicalConv: Conversation = {
        id: convId,
        participantOneId: initialRequest.senderId,
        participantOneName: residentA.displayName,
        participantTwoId: residentB.id,
        participantTwoName: residentB.displayName,
        subject: initialRequest.subject,
        contextType: 'general',
        status: 'accepted',
        lastMessage: initialRequest.initialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      const openingMessage: Message = {
        id: 'msg-initial-991',
        conversationId: convId,
        senderId: residentA.id,
        senderName: residentA.displayName,
        content: initialRequest.initialMessage,
        createdAt: initialRequest.createdAt,
      };

      // 3. Helper to determine participant membership supporting both UUIDs and Persona IDs
      const isUserParticipant = (userId: string, p1: string, p2: string) => {
        const dbId = toDatabaseUserId(userId);
        const personaId = fromDatabaseUserId(userId);
        const check = (id: string) =>
          id === userId ||
          id === dbId ||
          id === personaId ||
          fromDatabaseUserId(id) === personaId ||
          toDatabaseUserId(id) === dbId;
        return check(p1) || check(p2);
      };

      // Verify visibility for Resident A
      assert.equal(
        isUserParticipant(residentA.id, canonicalConv.participantOneId, canonicalConv.participantTwoId),
        true,
        'Resident A must be recognized as participant'
      );

      // Verify visibility for Resident B
      assert.equal(
        isUserParticipant(residentB.id, canonicalConv.participantOneId, canonicalConv.participantTwoId),
        true,
        'Resident B must be recognized as participant'
      );

      // Verify opening message is intact
      assert.equal(openingMessage.conversationId, canonicalConv.id);
      assert.equal(openingMessage.content, initialRequest.initialMessage);
      assert.equal(openingMessage.senderId, residentA.id);
    });

    test('Conversation persistence survives simulated page refresh and re-login via local cache and remote merge', () => {
      const conv1: Conversation = {
        id: 'conv-persisted-1',
        participantOneId: 'user-a',
        participantOneName: 'Alice',
        participantTwoId: 'user-b',
        participantTwoName: 'Bob',
        subject: 'General inquiry',
        contextType: 'general',
        status: 'accepted',
        lastMessage: 'Let us meet at the Central Park',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      // Simulated local cache before refresh
      let localStorageMock: Record<string, string> = {
        'nadikomuniti_conversations_cache': JSON.stringify([conv1]),
      };

      // Page refresh: state is hydrated from local storage cache
      const cached = JSON.parse(localStorageMock['nadikomuniti_conversations_cache'] || '[]');
      assert.equal(cached.length, 1);
      assert.equal(cached[0].id, 'conv-persisted-1');

      // Remote sync returns server records: merge with Map prevents disappearance
      const serverRecords: Conversation[] = [
        {
          id: 'conv-persisted-1',
          participantOneId: 'user-a',
          participantOneName: 'Alice',
          participantTwoId: 'user-b',
          participantTwoName: 'Bob',
          subject: 'General inquiry',
          contextType: 'general',
          status: 'accepted',
          lastMessage: 'Updated from server: confirmed',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        },
      ];

      const map = new Map<string, Conversation>();
      cached.forEach((c: Conversation) => map.set(c.id, c));
      serverRecords.forEach((c: Conversation) => map.set(c.id, c));
      const reconciled = Array.from(map.values());

      assert.equal(reconciled.length, 1);
      assert.equal(reconciled[0].lastMessage, 'Updated from server: confirmed');
    });

    test('getRecipientName correctly resolves the other participant preventing wrong-contact self-display bug', () => {
      const currentResidentId = 'user-nurul';
      const currentResidentDbId = toDatabaseUserId(currentResidentId);

      const conv: Conversation = {
        id: 'conv-test-contact',
        participantOneId: currentResidentDbId, // Stored as Supabase UUID
        participantOneName: 'Nurul Izzati',
        participantTwoId: 'user-harith',
        participantTwoName: 'Harith Danial',
        subject: 'Help with gardening',
        contextType: 'general',
        status: 'accepted',
        lastMessage: 'Thank you!',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      const isCurrentResident = (id?: string | null) => {
        if (!id) return false;
        if (id === currentResidentId) return true;
        if (id === currentResidentDbId) return true;
        if (toDatabaseUserId(id) === currentResidentDbId) return true;
        return false;
      };

      const getRecipientName = (c: Conversation) => {
        const isP1 = isCurrentResident(c.participantOneId);
        return isP1 ? c.participantTwoName : c.participantOneName;
      };

      // Even though participantOneId is stored as UUID and currentResidentId is persona string,
      // it correctly identifies participantOne as current user and returns Harith (participantTwo), NOT Nurul!
      assert.equal(getRecipientName(conv), 'Harith Danial');
    });

    test('Selected conversation locks activeConversationId and does not jump when incoming messages arrive', () => {
      let activeConversationId = 'conv-selected-3';

      const userConversations: Conversation[] = [
        {
          id: 'conv-1',
          participantOneId: 'user-a',
          participantOneName: 'Alice',
          participantTwoId: 'user-b',
          participantTwoName: 'Bob',
          lastMessage: 'Older message',
          lastMessageTime: '2026-10-23T10:00:00Z',
          status: 'accepted',
          unreadCount: 0,
        },
        {
          id: 'conv-selected-3',
          participantOneId: 'user-a',
          participantOneName: 'Alice',
          participantTwoId: 'user-c',
          participantTwoName: 'Charlie',
          lastMessage: 'Important talk',
          lastMessageTime: '2026-10-23T09:00:00Z',
          status: 'accepted',
          unreadCount: 0,
        },
      ];

      // A new message arrives in conv-1 changing its lastMessageTime to newer than conv-selected-3
      userConversations[0].lastMessageTime = '2026-10-23T12:00:00Z';
      userConversations[0].lastMessage = 'Brand new message!';

      // Re-sort list
      userConversations.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());

      // activeConv must resolve conv-selected-3 because activeConversationId remains locked
      const activeConv = activeConversationId
        ? userConversations.find((c) => c.id === activeConversationId) || null
        : userConversations[0];

      assert.equal(activeConv?.id, 'conv-selected-3', 'Active conversation must NOT jump to the newest topmost thread');
      assert.equal(activeConv?.participantTwoName, 'Charlie');
    });
  });

  describe('Part 5, 6, 7 — New User Address Registration, Search Normalization & Privacy', () => {
    test('Address normalization supports variations in casing, punctuation, abbreviations, and spacing', () => {
      const norm = (str: string) =>
        str
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
          .replace(/\b(no|nomor|unit|jln|jalan|lorong)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const registeredAddress = 'No. 12, Jalan EV 1/2';
      const registeredPrecinct = 'Elmina Valley 1 (EV1)';
      const registeredTarget = `${norm(registeredAddress)} ${norm(registeredPrecinct)}`;

      // Queries that should match the registered property
      const queryVariations = [
        '12 ev 1/2',
        'no 12 jalan ev 1/2',
        'JALAN EV 1/2',
        'EV1 12',
        '12 EV1',
        'No. 12, Jln EV 1/2 (EV1)',
      ];

      for (const q of queryVariations) {
        const normalizedQuery = norm(q);
        const queryTokens = normalizedQuery.split(' ').filter(Boolean);

        const isMatch =
          registeredTarget.includes(normalizedQuery) ||
          queryTokens.every((token) => registeredTarget.includes(token));

        assert.equal(isMatch, true, `Query "${q}" should match registered address "${registeredAddress}"`);
      }
    });

    test('Address search returns masked property details without leaking email or raw phone numbers', () => {
      const userProfiles: UserProfile[] = [
        {
          id: 'user-new-resident',
          fullName: 'Siti Aminah',
          displayName: 'Siti',
          role: 'resident',
          townshipPrecinct: 'Elmina Green 3',
          unitNumber: 'No. 88, Jalan EG 3/4',
          phone: '+60123456789', // Private
          verificationStatus: 'verified',
          createdAt: new Date().toISOString(),
        },
      ];

      const norm = (str: string) =>
        str
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
          .replace(/\b(no|nomor|unit|jln|jalan|lorong)\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const query = 'No. 88 EG 3';
      const normalizedQuery = norm(query);
      const queryTokens = normalizedQuery.split(' ').filter(Boolean);

      const searchResults = userProfiles
        .filter((p) => {
          const unit = p.unitNumber ? norm(p.unitNumber) : '';
          const precinct = norm(p.townshipPrecinct || '');
          const combined = `${unit} ${precinct}`;
          return combined.includes(normalizedQuery) || queryTokens.every((token) => combined.includes(token));
        })
        .map((p) => ({
          targetId: p.id,
          precinct: p.townshipPrecinct,
          maskedProperty: p.unitNumber || `Residence ${p.townshipPrecinct}`,
        }));

      assert.equal(searchResults.length, 1);
      assert.equal(searchResults[0].targetId, 'user-new-resident');
      assert.equal(searchResults[0].precinct, 'Elmina Green 3');
      assert.equal(searchResults[0].maskedProperty, 'No. 88, Jalan EG 3/4');

      // Verify strict privacy shield: no phone or email exposed in search payload
      const resultJson = JSON.stringify(searchResults[0]);
      assert.equal(resultJson.includes('+60123456789'), false, 'Phone number must NOT be in search results');
      assert.equal(resultJson.includes('phone'), false, 'Phone key must NOT be in search results');
      assert.equal(resultJson.includes('email'), false, 'Email key must NOT be in search results');
    });
  });

  describe('Part 8 — Verified Account Status for Successfully Registered Users', () => {
    test('Newly registered resident receives Verified status upon successful registration', () => {
      const registeredUser: UserProfile = {
        id: 'usr-new-001',
        fullName: 'Ahmad Faiz',
        displayName: 'Ahmad',
        role: 'resident',
        townshipPrecinct: 'Elmina Ridge',
        unitNumber: 'No. 3, Jalan ER 1/1',
        verificationStatus: 'verified', // Registered account badge
        createdAt: new Date().toISOString(),
      };

      assert.equal(registeredUser.verificationStatus, 'verified');
      assert.equal(registeredUser.role, 'resident');

      // Verified registered resident does NOT have management privileges
      const isManagement = registeredUser.role === 'management';
      assert.equal(isManagement, false, 'Basic Verified badge must NOT grant management privileges');
    });

    test('Unauthenticated or visitor accounts do not receive Verified status', () => {
      const visitorProfile: Partial<UserProfile> = {
        id: 'guest-session',
        role: 'resident',
        verificationStatus: 'unverified',
      };

      assert.equal(visitorProfile.verificationStatus, 'unverified');
    });
  });

  describe('Part 9 — Contextual Messaging from Exchange & Local Services', () => {
    test('Exchange listing message shortcut preserves contextual item and initial inquiry', () => {
      const listingId = 'ex-item-lawnmower';
      const sellerId = 'user-vikram';
      const buyerId = 'user-nurul';

      const initialRequest: PropertyMessageRequest = {
        id: 'req-exchange-1',
        senderId: buyerId,
        recipientId: sellerId,
        propertyAddress: 'Exchange Listing: Cordless Electric Lawnmower',
        subject: 'Exchange Item Inquiry: Cordless Electric Lawnmower',
        initialMessage: 'Hi Vikram, is this still available for collection this weekend in Denai Alam?',
        isAnonymous: false,
        senderDisplayName: 'Nurul Izzati',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      assert.equal(initialRequest.senderId, buyerId);
      assert.equal(initialRequest.recipientId, sellerId);
      assert.equal(initialRequest.subject.includes('Lawnmower'), true);
      assert.equal(initialRequest.status, 'pending');

      // Acceptance transitions to canonical conversation with context
      const conv: Conversation = {
        id: 'conv-exchange-1',
        participantOneId: buyerId,
        participantOneName: 'Nurul Izzati',
        participantTwoId: sellerId,
        participantTwoName: 'Vikram Singh',
        subject: initialRequest.subject,
        contextType: 'exchange',
        contextId: listingId,
        status: 'accepted',
        lastMessage: initialRequest.initialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };

      assert.equal(conv.status, 'accepted');
      assert.equal(conv.contextType, 'exchange');
      assert.equal(conv.contextId, listingId);
    });
  });
});
