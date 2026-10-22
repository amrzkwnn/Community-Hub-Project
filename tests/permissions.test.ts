import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Role & Management Console Access Control', () => {
  function canAccessManagementConsole(userRole: string): boolean {
    return userRole === 'management';
  }

  function canVerifyIncidents(userRole: string): boolean {
    return userRole === 'management';
  }

  function canBroadcastOfficialAnnouncements(userRole: string): boolean {
    return userRole === 'management' || userRole === 'security';
  }

  it('permits management role to access management console', () => {
    assert.strictEqual(canAccessManagementConsole('management'), true);
  });

  it('denies resident role from accessing management console', () => {
    assert.strictEqual(canAccessManagementConsole('resident'), false);
  });

  it('denies security role from accessing administrative management console', () => {
    assert.strictEqual(canAccessManagementConsole('security'), false);
  });

  it('denies moderator role from accessing management console', () => {
    assert.strictEqual(canAccessManagementConsole('moderator'), false);
  });

  it('strictly restricts incident verification to management role only', () => {
    assert.strictEqual(canVerifyIncidents('management'), true);
    assert.strictEqual(canVerifyIncidents('resident'), false);
    assert.strictEqual(canVerifyIncidents('security'), false);
    assert.strictEqual(canVerifyIncidents('moderator'), false);
  });

  it('allows management and security to broadcast official announcements', () => {
    assert.strictEqual(canBroadcastOfficialAnnouncements('management'), true);
    assert.strictEqual(canBroadcastOfficialAnnouncements('security'), true);
    assert.strictEqual(canBroadcastOfficialAnnouncements('resident'), false);
  });
});
