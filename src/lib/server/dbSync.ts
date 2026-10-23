import { createClient } from '@supabase/supabase-js';
import { 
  INITIAL_RESILIENCE_INCIDENTS, 
  INITIAL_POSTS, 
  INITIAL_SERVICES, 
  INITIAL_EXCHANGE_ITEMS,
  INITIAL_PROFILES,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_MESSAGE_REQUESTS
} from '@/lib/data/mockData';

// Map persona IDs to canonical Supabase UUIDs
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
  return uuid;
}

export function mapToSupabaseReportType(type: string): string {
  switch (type) {
    case 'flash_flood':
    case 'flood':
    case 'flooding':
      return 'flood';
    case 'blocked_drain':
      return 'blocked_drain';
    case 'fallen_tree':
      return 'fallen_tree';
    case 'pothole':
      return 'pothole';
    case 'street_light':
      return 'street_light';
    case 'water_disruption':
      return 'water_disruption';
    case 'misconduct':
    case 'waste_dump':
    case 'vandalism':
      return 'misconduct';
    case 'spam':
      return 'spam';
    default:
      return 'other';
  }
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || serviceKey === '[SENSITIVE]') {
    // If service key is not available, try anon key
    const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !fallbackKey) return null;
    return createClient(supabaseUrl, fallbackKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// In-memory persistent cache for serverless invocations within the same container
let memoryIncidents = [...INITIAL_RESILIENCE_INCIDENTS];
let memoryPosts = [...INITIAL_POSTS];
let memoryComments: Record<string, any[]> = {};
let memoryExchange = [...INITIAL_EXCHANGE_ITEMS];
let memoryServices = [...INITIAL_SERVICES];
let memoryConversations = [...INITIAL_CONVERSATIONS];
let memoryMessages = [...INITIAL_MESSAGES];
let memoryMessageRequests = [...INITIAL_MESSAGE_REQUESTS];

export async function bootstrapDatabaseIfEmpty(supabase: any) {
  if (!supabase) return;
  try {
    // Check community_reports
    const { count: reportsCount } = await supabase.from('community_reports').select('*', { count: 'exact', head: true });
    if (reportsCount === 0) {
      const seedReports = INITIAL_RESILIENCE_INCIDENTS.slice(0, 5).map((inc) => ({
        reporter_id: toDatabaseUserId(inc.reporterId),
        report_type: mapToSupabaseReportType(inc.incidentType),
        title: inc.title,
        description: inc.description,
        location_name: inc.locationName,
        latitude: inc.latitude,
        longitude: inc.longitude,
        severity: inc.severity,
        status: (inc.status as string) === 'resolved' ? 'resolved' : (inc.status as string) === 'in_progress' ? 'under_review' : 'pending',
        is_anonymous: Boolean(inc.isAnonymous),
        management_notes: inc.managementNotes || null,
        created_at: inc.createdAt,
      }));
      await supabase.from('community_reports').insert(seedReports);
    }

    // Check community_posts
    const { count: postsCount } = await supabase.from('community_posts').select('*', { count: 'exact', head: true });
    if (postsCount === 0) {
      const seedPosts = INITIAL_POSTS.slice(0, 5).map((p) => ({
        author_id: toDatabaseUserId(p.authorId),
        category: p.category === 'announcement' ? 'general' : p.category === 'security_alert' ? 'general' : p.category,
        title: p.title,
        content: p.content,
        image_url: p.imageUrl || null,
        is_anonymous: Boolean(p.isAnonymous),
        upvotes_count: p.upvotesCount || 0,
        status: p.status === 'active' ? 'active' : 'active',
        created_at: p.createdAt,
      }));
      await supabase.from('community_posts').insert(seedPosts);
    }
  } catch (err) {
    console.warn('[dbSync] Bootstrap attempt error (non-fatal):', err);
  }
}

export function getMemoryStore() {
  return {
    incidents: memoryIncidents,
    posts: memoryPosts,
    comments: memoryComments,
    exchange: memoryExchange,
    services: memoryServices,
    conversations: memoryConversations,
    messages: memoryMessages,
    messageRequests: memoryMessageRequests,
  };
}

export function updateMemoryStore(updates: {
  incidents?: any[];
  posts?: any[];
  comments?: Record<string, any[]>;
  exchange?: any[];
  services?: any[];
  conversations?: any[];
  messages?: any[];
  messageRequests?: any[];
}) {
  if (updates.incidents) memoryIncidents = updates.incidents;
  if (updates.posts) memoryPosts = updates.posts;
  if (updates.comments) memoryComments = updates.comments;
  if (updates.exchange) memoryExchange = updates.exchange;
  if (updates.services) memoryServices = updates.services;
  if (updates.conversations) memoryConversations = updates.conversations;
  if (updates.messages) memoryMessages = updates.messages;
  if (updates.messageRequests) memoryMessageRequests = updates.messageRequests;
}
