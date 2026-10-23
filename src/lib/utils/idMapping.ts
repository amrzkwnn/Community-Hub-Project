// Canonical mapping between frontend persona IDs and Supabase UUIDs

export const PERSONA_TO_UUID: Record<string, string> = {
  'user-nurul': '11111111-1111-4111-8111-111111111111',
  'user-vikram': '22222222-2222-4222-8222-222222222222',
  'user-azman': '33333333-3333-4333-8333-333333333333',
  'user-rosli': '44444444-4444-4444-8444-444444444444',
};

export const UUID_TO_PERSONA: Record<string, string> = {
  '11111111-1111-4111-8111-111111111111': 'user-nurul',
  '22222222-2222-4222-8222-222222222222': 'user-vikram',
  '33333333-3333-4333-8333-333333333333': 'user-azman',
  '44444444-4444-4444-8444-444444444444': 'user-rosli',
};

export function toDatabaseUserId(id?: string | null): string {
  if (!id) return '11111111-1111-4111-8111-111111111111';
  if (PERSONA_TO_UUID[id]) return PERSONA_TO_UUID[id];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return '11111111-1111-4111-8111-111111111111';
}

export function fromDatabaseUserId(uuid?: string | null): string {
  if (!uuid) return 'user-nurul';
  if (UUID_TO_PERSONA[uuid]) return UUID_TO_PERSONA[uuid];
  if (uuid.startsWith('user-')) return uuid;
  return uuid;
}
