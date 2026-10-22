import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Verified Incident Alerts & Audit Trail', () => {
  interface Incident {
    id: string;
    title: string;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedByName?: string;
    verifiedAt?: string;
  }

  function verifyIncident(
    incident: Incident,
    actorRole: string,
    actorId: string,
    actorName: string
  ): { success: boolean; incident?: Incident; auditEvent?: { action: string; actorId: string; actorName: string; actorRole: string; targetType: string; targetId: string; timestamp?: string }; error?: string } {
    if (actorRole !== 'management') {
      return { success: false, error: 'Only management is authorized to verify incidents.' };
    }

    const verifiedIncident: Incident = {
      ...incident,
      isVerified: true,
      verifiedBy: actorId,
      verifiedByName: actorName,
      verifiedAt: new Date().toISOString(),
    };

    const auditEvent = {
      actorId,
      actorName,
      actorRole,
      action: 'VERIFY_INCIDENT',
      targetType: 'incident',
      targetId: incident.id,
      timestamp: verifiedIncident.verifiedAt,
    };

    return {
      success: true,
      incident: verifiedIncident,
      auditEvent,
    };
  }

  it('rejects incident self-verification by regular residents', () => {
    const rawIncident: Incident = {
      id: 'inc-99',
      title: 'Takungan Air Lebihan',
      isVerified: false,
    };

    const result = verifyIncident(rawIncident, 'resident', 'user-resident', 'Ahmad Resident');
    assert.strictEqual(result.success, false);
    assert.strictEqual(rawIncident.isVerified, false);
    assert.match(result.error || '', /Only management/);
  });

  it('allows management officer to verify incident and logs audit trail', () => {
    const rawIncident: Incident = {
      id: 'inc-101',
      title: 'Pokok Tumbang Laluan Denai',
      isVerified: false,
    };

    const result = verifyIncident(rawIncident, 'management', 'user-azman', 'Capt (B) Azman');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.incident?.isVerified, true);
    assert.strictEqual(result.incident?.verifiedByName, 'Capt (B) Azman');
    assert.strictEqual(result.auditEvent?.action, 'VERIFY_INCIDENT');
  });
});
