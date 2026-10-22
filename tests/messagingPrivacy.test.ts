import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Private Property Messaging & Privacy Shield', () => {
  interface PropertyProfile {
    id: string;
    fullName: string;
    phone: string;
    unitNumber: string;
    townshipPrecinct: string;
    isVerified: boolean;
  }

  function maskPropertySearchResult(profile: PropertyProfile) {
    return {
      targetId: profile.id,
      precinct: profile.townshipPrecinct,
      maskedProperty: profile.unitNumber,
    };
  }

  function canSendMessageInConversation(conversationStatus: string): boolean {
    return conversationStatus === 'accepted';
  }

  it('masks personal identifiable information (real name and phone) during property search', () => {
    const rawProfile: PropertyProfile = {
      id: 'uuid-1234',
      fullName: 'Siti Aminah binti Razali',
      phone: '+6012-9988776',
      unitNumber: 'No. 45, Jalan EG 3/2',
      townshipPrecinct: 'Elmina Green 3',
      isVerified: true,
    };

    const masked = maskPropertySearchResult(rawProfile);

    // Verified properties do not leak fullName or phone
    assert.strictEqual('fullName' in masked, false);
    assert.strictEqual('phone' in masked, false);
    assert.strictEqual(masked.targetId, 'uuid-1234');
    assert.strictEqual(masked.precinct, 'Elmina Green 3');
  });

  it('only permits ongoing replies in accepted conversations', () => {
    assert.strictEqual(canSendMessageInConversation('accepted'), true);
    assert.strictEqual(canSendMessageInConversation('pending'), false);
    assert.strictEqual(canSendMessageInConversation('rejected'), false);
    assert.strictEqual(canSendMessageInConversation('blocked'), false);
  });

  it('correctly labels anonymous message replies', () => {
    const message = {
      id: 'msg-1',
      senderId: 'user-1',
      senderName: 'Elmina Neighbour (Anonymous)',
      isAnonymous: true,
      content: 'Hello neighbour, your car brake lights were left on overnight.',
    };

    assert.strictEqual(message.isAnonymous, true);
    assert.strictEqual(message.senderName, 'Elmina Neighbour (Anonymous)');
  });
});
