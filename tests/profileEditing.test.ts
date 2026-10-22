import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Profile Editing & Read-Only Field Protection', () => {
  interface UserProfile {
    id: string;
    fullName: string;
    displayName: string;
    role: string;
    unitNumber: string;
    phone: string;
    avatarUrl?: string;
  }

  function updateResidentProfile(
    original: UserProfile,
    updates: Partial<UserProfile>,
    actorRole: string
  ): { success: boolean; profile: UserProfile; error?: string } {
    // If not management, strict protection on full_name, id, unitNumber, role
    if (actorRole !== 'management') {
      if (updates.id && updates.id !== original.id) {
        return { success: false, profile: original, error: 'ID pengguna tidak boleh diubah.' };
      }
      if (updates.fullName && updates.fullName !== original.fullName) {
        return { success: false, profile: original, error: 'Nama sebenar adalah read-only untuk penduduk.' };
      }
      if (updates.unitNumber && updates.unitNumber !== original.unitNumber) {
        return { success: false, profile: original, error: 'Alamat unit berdaftar hanya boleh diubah oleh pihak pengurusan.' };
      }
      if (updates.role && updates.role !== original.role) {
        return { success: false, profile: original, error: 'Peranan tidak boleh dinaik taraf sendiri.' };
      }
    }

    const updated: UserProfile = {
      ...original,
      displayName: updates.displayName?.trim() || original.displayName,
      phone: updates.phone?.trim() || original.phone,
      avatarUrl: updates.avatarUrl || original.avatarUrl,
      // If management, allow unit/role update
      ...(actorRole === 'management' && {
        role: updates.role || original.role,
        unitNumber: updates.unitNumber || original.unitNumber,
        fullName: updates.fullName || original.fullName,
      }),
    };

    return { success: true, profile: updated };
  }

  it('allows residents to update their display nickname and phone number', () => {
    const profile: UserProfile = {
      id: 'usr-1',
      fullName: 'Nurul Huda',
      displayName: 'Nurul',
      role: 'resident',
      unitNumber: 'No. 99, Jalan EG 3/4',
      phone: '+6012-3450001',
    };

    const result = updateResidentProfile(
      profile,
      { displayName: 'Kak Nurul EG3', phone: '+6012-9998888' },
      'resident'
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.profile.displayName, 'Kak Nurul EG3');
    assert.strictEqual(result.profile.phone, '+6012-9998888');
    assert.strictEqual(result.profile.fullName, 'Nurul Huda');
  });

  it('prevents residents from changing their real name or registered address', () => {
    const profile: UserProfile = {
      id: 'usr-1',
      fullName: 'Nurul Huda',
      displayName: 'Nurul',
      role: 'resident',
      unitNumber: 'No. 99, Jalan EG 3/4',
      phone: '+6012-3450001',
    };

    const nameAttempt = updateResidentProfile(
      profile,
      { fullName: 'Hacker Name' },
      'resident'
    );
    assert.strictEqual(nameAttempt.success, false);
    assert.match(nameAttempt.error || '', /Nama sebenar/);

    const addressAttempt = updateResidentProfile(
      profile,
      { unitNumber: 'Penthouse Unit A' },
      'resident'
    );
    assert.strictEqual(addressAttempt.success, false);
    assert.match(addressAttempt.error || '', /Alamat unit berdaftar/);
  });

  it('prevents resident privilege escalation to management role', () => {
    const profile: UserProfile = {
      id: 'usr-1',
      fullName: 'Nurul Huda',
      displayName: 'Nurul',
      role: 'resident',
      unitNumber: 'No. 99, Jalan EG 3/4',
      phone: '+6012-3450001',
    };

    const roleAttempt = updateResidentProfile(
      profile,
      { role: 'management' },
      'resident'
    );
    assert.strictEqual(roleAttempt.success, false);
    assert.match(roleAttempt.error || '', /Peranan tidak boleh dinaik taraf sendiri/);
  });
});
