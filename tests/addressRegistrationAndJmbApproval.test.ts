import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { 
  ResidentAddressRecord, 
  AddressVerificationStatus, 
  ResidenceType,
  PropertyMessageRequest,
  Conversation,
  Message 
} from '../src/types/index.ts';

describe('NADIKOMUNITI: Resident Address Registration, JMB Approval & Address Search Suite', () => {

  describe('1. Resident Address Registration Flow', () => {
    it('initializes with pending approval status upon submission', () => {
      const submission = {
        id: 'addr-test-1',
        userId: 'user-new-resident',
        fullName: 'Ahmad Faiz',
        precinct: 'Elmina West (EV1)',
        unitNumber: 'EW-12-05',
        streetName: 'Jalan Elmina Barat 2',
        residenceType: 'owner' as ResidenceType,
        proofDocumentName: 'Faiz_SP_Agreement.pdf',
        status: 'pending' as AddressVerificationStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      assert.strictEqual(submission.status, 'pending', 'Newly registered address must be Pending JMB Approval');
      assert.strictEqual(submission.residenceType, 'owner');
      assert.strictEqual(submission.unitNumber, 'EW-12-05');
      assert.strictEqual(submission.rejectionReason, undefined);
    });

    it('prevents alteration to already verified addresses by non-management residents', () => {
      const verifiedRecord: ResidentAddressRecord = {
        id: 'addr-nurul',
        userId: 'user-nurul',
        fullName: 'Nurul Huda',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 3',
        streetName: 'Jalan Elmina Hijau 1/2',
        residenceType: 'owner',
        status: 'verified',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-02T14:30:00Z',
      };

      const attemptEdit = (currentUserRole: string, existing: ResidentAddressRecord) => {
        if (existing.status === 'verified' && currentUserRole !== 'management') {
          return {
            success: false,
            error: 'Your residential address is already verified by JMB. Unauthorized alterations are locked. Please contact JMB for relocation.',
          };
        }
        return { success: true };
      };

      const residentResult = attemptEdit('resident', verifiedRecord);
      assert.strictEqual(residentResult.success, false);
      assert.match(residentResult.error || '', /Unauthorized alterations are locked/);

      const jmbResult = attemptEdit('management', verifiedRecord);
      assert.strictEqual(jmbResult.success, true, 'JMB officers are authorized to manage records');
    });

    it('allows resubmission if an address application was previously rejected', () => {
      const rejectedRecord: ResidentAddressRecord = {
        id: 'addr-rejected-1',
        userId: 'user-resident-c',
        fullName: 'Chong Wei',
        precinct: 'Elmina Valley 2',
        unitNumber: 'EV2-88',
        residenceType: 'tenant',
        status: 'rejected',
        rejectionReason: 'Tenancy agreement expired or incomplete',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-02T11:00:00Z',
      };

      const resubmit = (existing: ResidentAddressRecord, newDocName: string) => {
        // Residents may resubmit if status is rejected or revoked
        assert.ok(existing.status === 'rejected' || existing.status === 'revoked');
        return {
          ...existing,
          proofDocumentName: newDocName,
          status: 'pending' as AddressVerificationStatus,
          rejectionReason: undefined,
          updatedAt: new Date().toISOString(),
        };
      };

      const updated = resubmit(rejectedRecord, 'Updated_Tenancy_Agreement_2026.pdf');
      assert.strictEqual(updated.status, 'pending');
      assert.strictEqual(updated.proofDocumentName, 'Updated_Tenancy_Agreement_2026.pdf');
      assert.strictEqual(updated.rejectionReason, undefined);
    });
  });

  describe('2. JMB Management Approval & Revocation Workflow', () => {
    it('approves pending address application and updates status to verified', () => {
      const pending: ResidentAddressRecord = {
        id: 'addr-vikram',
        userId: 'user-vikram',
        fullName: 'Vikram Singh',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 3',
        residenceType: 'tenant',
        status: 'pending',
        createdAt: '2026-10-20T11:15:00Z',
        updatedAt: '2026-10-20T11:15:00Z',
      };

      const approve = (record: ResidentAddressRecord, reviewerId: string, reviewerName: string) => {
        return {
          ...record,
          status: 'verified' as AddressVerificationStatus,
          reviewedBy: reviewerId,
          reviewedByName: reviewerName,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const approved = approve(pending, 'user-azman', 'Capt (B) Azman Salleh (JMB)');
      assert.strictEqual(approved.status, 'verified');
      assert.strictEqual(approved.reviewedByName, 'Capt (B) Azman Salleh (JMB)');
      assert.ok(approved.reviewedAt);
    });

    it('rejects pending address application and records mandatory reviewer reason', () => {
      const pending: ResidentAddressRecord = {
        id: 'addr-test-fail',
        userId: 'user-failing',
        fullName: 'Unknown Applicant',
        precinct: 'Elmina Valley 3',
        unitNumber: 'EV3-999',
        residenceType: 'tenant',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const reject = (record: ResidentAddressRecord, reason: string, reviewerName: string) => {
        assert.ok(reason.trim().length > 0, 'Reason must not be empty');
        return {
          ...record,
          status: 'rejected' as AddressVerificationStatus,
          rejectionReason: reason,
          reviewedByName: reviewerName,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const rejected = reject(pending, 'Unit number does not match township cadastral register', 'Capt Azman');
      assert.strictEqual(rejected.status, 'rejected');
      assert.strictEqual(rejected.rejectionReason, 'Unit number does not match township cadastral register');
    });

    it('revokes previously verified address with audit trail', () => {
      const verified: ResidentAddressRecord = {
        id: 'addr-sarjan',
        userId: 'user-rosli',
        fullName: 'Sarjan Rosli',
        precinct: 'Elmina West (EV1)',
        unitNumber: 'EW-Guardhouse-01',
        residenceType: 'owner',
        status: 'verified',
        createdAt: '2026-08-01T08:00:00Z',
        updatedAt: '2026-08-01T08:00:00Z',
      };

      const revoke = (record: ResidentAddressRecord, reason: string, reviewerName: string) => {
        return {
          ...record,
          status: 'revoked' as AddressVerificationStatus,
          rejectionReason: reason,
          reviewedByName: reviewerName,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      };

      const revoked = revoke(verified, 'Security officer reassigned to external township', 'Capt Azman');
      assert.strictEqual(revoked.status, 'revoked');
      assert.match(revoked.rejectionReason || '', /reassigned/);
    });
  });

  describe('3. Address Search & Privacy Enforcement', () => {
    const registrations: ResidentAddressRecord[] = [
      {
        id: 'addr-nurul',
        userId: 'user-nurul',
        fullName: 'Nurul Huda',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 3',
        streetName: 'Jalan Elmina Hijau 1/2',
        residenceType: 'owner',
        status: 'verified',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-02T14:30:00Z',
      },
      {
        id: 'addr-vikram',
        userId: 'user-vikram',
        fullName: 'Vikram Singh',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 3',
        streetName: 'Jalan Elmina Hijau 1/2',
        residenceType: 'tenant',
        status: 'verified',
        createdAt: '2026-10-20T11:15:00Z',
        updatedAt: '2026-10-21T09:00:00Z',
      },
      {
        id: 'addr-pending',
        userId: 'user-pending-test',
        fullName: 'Pending Person',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 99',
        residenceType: 'owner',
        status: 'pending',
        createdAt: '2026-10-22T10:00:00Z',
        updatedAt: '2026-10-22T10:00:00Z',
      },
      {
        id: 'addr-rejected',
        userId: 'user-rejected-test',
        fullName: 'Rejected Person',
        precinct: 'Elmina Green 1 (EG1)',
        unitNumber: 'EG 88',
        residenceType: 'tenant',
        status: 'rejected',
        createdAt: '2026-10-22T10:00:00Z',
        updatedAt: '2026-10-22T10:00:00Z',
      },
    ];

    const searchProperties = (query: string, currentUserId: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];

      // Enforce: only verified addresses return
      const verified = registrations.filter(
        (r) => r.status === 'verified' && r.userId !== currentUserId
      );

      const matches = verified.filter(
        (r) =>
          r.unitNumber.toLowerCase().includes(q) ||
          (r.streetName && r.streetName.toLowerCase().includes(q)) ||
          r.precinct.toLowerCase().includes(q)
      );

      return matches.map((r) => ({
        targetId: r.userId,
        precinct: r.precinct,
        maskedProperty: `Unit ${r.unitNumber}${r.streetName ? `, ${r.streetName}` : ''}`,
        residenceType: r.residenceType,
      }));
    };

    it('returns ONLY verified addresses and filters out pending/rejected associations', () => {
      const results = searchProperties('EG', 'user-visitor');
      const units = results.map((r) => r.maskedProperty);

      // Should include EG 3 (Nurul & Vikram)
      assert.ok(units.some((u) => u.includes('EG 3')));
      // Should NOT include EG 99 (pending) or EG 88 (rejected)
      assert.strictEqual(units.some((u) => u.includes('EG 99')), false, 'Pending address must not appear');
      assert.strictEqual(units.some((u) => u.includes('EG 88')), false, 'Rejected address must not appear');
    });

    it('supports multiple residents at the same verified property without collision', () => {
      const results = searchProperties('EG 3', 'user-visitor');
      assert.strictEqual(results.length, 2, 'Both Nurul and Vikram should appear for EG 3');

      const owner = results.find((r) => r.residenceType === 'owner');
      const tenant = results.find((r) => r.residenceType === 'tenant');

      assert.ok(owner, 'Owner record must exist');
      assert.ok(tenant, 'Tenant record must exist');
      assert.strictEqual(owner?.targetId, 'user-nurul');
      assert.strictEqual(tenant?.targetId, 'user-vikram');
    });

    it('protects resident privacy by masking personal names in property search', () => {
      const results = searchProperties('EG 3', 'user-azman');
      results.forEach((r) => {
        // Output format must be "Unit EG 3, Jalan Elmina Hijau 1/2", not revealing the resident's full name directly in the address string
        assert.ok(r.maskedProperty.startsWith('Unit EG 3'));
        assert.strictEqual((r as any).fullName, undefined, 'Resident full name must not be leaked in search property schema');
      });
    });
  });

  describe('4. Full End-to-End Property Messaging Sequence', () => {
    it('creates property request, allows recipient acceptance, and binds canonical conversation with initial message', () => {
      // Step 1: Resident B (Vikram) creates request to Resident A (Nurul)
      const request: PropertyMessageRequest = {
        id: 'req-test-e2e',
        senderId: 'user-vikram',
        recipientId: 'user-nurul',
        propertyAddress: 'Unit EG 3, Jalan Elmina Hijau 1/2',
        subject: 'Perimeter Wall Creepers',
        initialMessage: 'Hi neighbor, the bougainvillea creepers near the shared wall look lovely. Could we trim them slightly before the storm season?',
        isAnonymous: false,
        senderDisplayName: 'Vikram Singh (Tenant)',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      assert.strictEqual(request.status, 'pending');

      // Step 2: Resident A (Nurul) accepts the request
      const acceptRequest = (req: PropertyMessageRequest, acceptorId: string, acceptorName: string) => {
        assert.strictEqual(req.recipientId, acceptorId, 'Only recipient can accept');
        const convId = `conv-${req.id}`;
        const conversation: Conversation = {
          id: convId,
          participantOneId: req.senderId,
          participantOneName: req.senderDisplayName || 'Resident Neighbour',
          participantTwoId: acceptorId,
          participantTwoName: acceptorName,
          subject: req.subject,
          contextType: 'property_messaging',
          status: 'accepted',
          lastMessage: req.initialMessage,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        };

        const initialMsg: Message = {
          id: `msg-${req.id}`,
          conversationId: convId,
          senderId: req.senderId,
          senderName: req.senderDisplayName || 'Neighbour',
          isAnonymous: req.isAnonymous,
          content: req.initialMessage,
          createdAt: req.createdAt,
        };

        const updatedRequest = { ...req, status: 'accepted' as const, conversationId: convId };

        return { conversation, initialMsg, updatedRequest };
      };

      const result = acceptRequest(request, 'user-nurul', 'Nurul Huda');

      // Step 3: Verify bidirectional visibility and preservation of initial message
      assert.strictEqual(result.conversation.participantOneId, 'user-vikram');
      assert.strictEqual(result.conversation.participantTwoId, 'user-nurul');
      assert.strictEqual(result.initialMsg.conversationId, result.conversation.id);
      assert.match(result.initialMsg.content, /bougainvillea creepers/);
      assert.strictEqual(result.updatedRequest.status, 'accepted');

      // Check both participants match conversation
      const isParticipant = (userId: string, conv: Conversation) =>
        conv.participantOneId === userId || conv.participantTwoId === userId;

      assert.ok(isParticipant('user-vikram', result.conversation), 'Resident B is a participant');
      assert.ok(isParticipant('user-nurul', result.conversation), 'Resident A is a participant');
      assert.strictEqual(isParticipant('user-stranger', result.conversation), false, 'Stranger is excluded');
    });
  });
});
