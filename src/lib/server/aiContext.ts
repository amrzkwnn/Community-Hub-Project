import { 
  INITIAL_POSTS, 
  INITIAL_EXCHANGE_ITEMS, 
  INITIAL_SERVICES, 
  INITIAL_RESILIENCE_INCIDENTS 
} from '../data/mockData.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroundedContextOptions {
  userRole?: string;
  userId?: string;
  query?: string;
}

export type CommunityModule = 'events' | 'incidents' | 'services' | 'exchange' | 'notices';

/**
 * Deterministically detects which township modules are relevant to the user query.
 * Avoids wasteful token consumption and unnecessary database queries.
 */
export function detectRelevantModules(query?: string): Set<CommunityModule> {
  if (!query || !query.trim()) {
    return new Set<CommunityModule>(); // Empty indicates general query: fetch top records from all modules
  }
  const q = query.toLowerCase();
  const modules = new Set<CommunityModule>();

  // Events & Calendar
  if (
    /event|acara|calendar|kalendar|aktiviti|activity|gotong|cleanup|gathering|bazaar|cycling|kayuhan|fest|this week|minggu ini|today|hari ini|tomorrow|esok|upcoming|akan datang|schedule|jadual/i.test(q)
  ) {
    modules.add('events');
    modules.add('notices');
  }

  // Incidents, Resilience Map, Hazards & Emergency
  if (
    /incident|insiden|report|lapor|flood|banjir|drain|longkang|tree|pokok|pothole|jalan|lamp|lampu|light|water|air terputus|hazard|bahaya|emergency|kecemasan|police|polis|bantuan/i.test(q)
  ) {
    modules.add('incidents');
  }

  // Local Services & Help Requests
  if (
    /service|perkhidmatan|servis|plumb|paip|electric|elektrik|tutor|tuition|kelas|pet|haiwan|kucing|cat|dog|garden|kebun|carpool|tumpang|repair|baiki|clean|cuci|aircond/i.test(q)
  ) {
    modules.add('services');
  }

  // Circular Exchange & Free Giveaways / Item Sharing
  if (
    /exchange|tukar|item|barang|giveaway|percuma|free|donate|sumbang|borrow|pinjam|tool|alat|book|buku|toy|mainan|furniture|perabot|plants|pokok bunga|preloved/i.test(q)
  ) {
    modules.add('exchange');
  }

  // Official Announcements & Notices
  if (
    /notice|notis|announcement|pengumuman|management|pengurusan|jmb|maintenance|penyelenggaraan|memo/i.test(q)
  ) {
    modules.add('notices');
  }

  return modules;
}

// In-memory short-lived cache (60 seconds) for public community records to reduce latency
interface CachedData {
  timestamp: number;
  announcements: Array<{ id: string; title: string; content: string; date: string }>;
  events: Array<{ id: string; title: string; date?: string; time?: string; venue?: string; description: string }>;
  exchange: Array<{ id: string; title: string; type: string; category: string; condition: string; precinct: string }>;
  services: Array<{ id: string; title: string; type: string; category: string; precinct: string; price?: string }>;
  incidents: Array<{ id: string; type: string; location: string; severity: string; status: string; description: string }>;
}

let memoryCache: CachedData | null = null;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Sanitizes and extracts verified, public community knowledge for the TESDH AI Assistant.
 * Strictly adheres to resident data privacy and limits prompt token overhead.
 */
export async function buildGroundedContext(
  supabase?: SupabaseClient | null,
  options: GroundedContextOptions = {}
): Promise<string> {
  const query = options.query || '';
  const targetModules = detectRelevantModules(query);
  const isGeneral = targetModules.size === 0;

  let announcements: Array<{ id: string; title: string; content: string; date: string }> = [];
  let upcomingEvents: Array<{ id: string; title: string; date?: string; time?: string; venue?: string; description: string }> = [];
  let exchangeListings: Array<{ id: string; title: string; type: string; category: string; condition: string; precinct: string }> = [];
  let localServices: Array<{ id: string; title: string; type: string; category: string; precinct: string; price?: string }> = [];
  let verifiedIncidents: Array<{ id: string; type: string; location: string; severity: string; status: string; description: string }> = [];

  const now = Date.now();
  const hasFreshCache = memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS;

  if (hasFreshCache && memoryCache) {
    announcements = memoryCache.announcements;
    upcomingEvents = memoryCache.events;
    exchangeListings = memoryCache.exchange;
    localServices = memoryCache.services;
    verifiedIncidents = memoryCache.incidents;
  } else if (supabase) {
    // Concurrently fetch records with limit 3-5 per relevant module
    try {
      const promises: Promise<unknown>[] = [];

      const fetchPosts = targetModules.has('notices') || targetModules.has('events') || isGeneral;
      const fetchExchange = targetModules.has('exchange') || isGeneral;
      const fetchServices = targetModules.has('services') || isGeneral;
      const fetchIncidents = targetModules.has('incidents') || isGeneral;

      if (fetchPosts) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('community_posts')
              .select('id, category, title, content, created_at')
              .is('deleted_at', null)
              .in('category', ['announcement', 'event'])
              .order('created_at', { ascending: false })
              .limit(isGeneral ? 6 : 8);

            if (data) {
              data.forEach((p) => {
                const item = p as { id: string; category: string; title: string; content: string; created_at: string };
                if (item.category === 'announcement') {
                  announcements.push({
                    id: item.id,
                    title: item.title,
                    content: item.content.slice(0, 150),
                    date: item.created_at,
                  });
                } else if (item.category === 'event') {
                  upcomingEvents.push({
                    id: item.id,
                    title: item.title,
                    description: item.content.slice(0, 120),
                  });
                }
              });
            }
          })()
        );
      }

      if (fetchExchange) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('exchange_listings')
              .select('id, title, listing_type, category, condition, precinct')
              .is('deleted_at', null)
              .in('status', ['available', 'reserved'])
              .limit(isGeneral ? 3 : 5);

            if (data) {
              exchangeListings = data.map((e) => {
                const ex = e as { id: string; title: string; listing_type: string; category: string; condition: string; precinct: string };
                return {
                  id: ex.id,
                  title: ex.title,
                  type: ex.listing_type,
                  category: ex.category,
                  condition: ex.condition,
                  precinct: ex.precinct,
                };
              });
            }
          })()
        );
      }

      if (fetchServices) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('service_listings')
              .select('id, title, service_type, category, precinct, price_estimate')
              .is('deleted_at', null)
              .eq('status', 'active')
              .limit(isGeneral ? 3 : 5);

            if (data) {
              localServices = data.map((s) => {
                const serv = s as { id: string; title: string; service_type: string; category: string; precinct: string; price_estimate?: string };
                return {
                  id: serv.id,
                  title: serv.title,
                  type: serv.service_type,
                  category: serv.category,
                  precinct: serv.precinct,
                  price: serv.price_estimate,
                };
              });
            }
          })()
        );
      }

      if (fetchIncidents) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('community_reports')
              .select('id, report_type, location_name, severity, status, description')
              .neq('status', 'pending')
              .neq('status', 'rejected')
              .limit(isGeneral ? 3 : 5);

            if (data) {
              verifiedIncidents = data.map((inc) => {
                const item = inc as { id: string; report_type: string; location_name: string; severity: string; status: string; description: string };
                return {
                  id: item.id,
                  type: item.report_type || 'other',
                  location: item.location_name || 'Bandar Elmina',
                  severity: item.severity || 'medium',
                  status: item.status || 'reported',
                  description: (item.description || '').slice(0, 120),
                };
              });
            }
          })()
        );
      }

      await Promise.allSettled(promises);

      // Cache the result
      memoryCache = {
        timestamp: now,
        announcements,
        events: upcomingEvents,
        exchange: exchangeListings,
        services: localServices,
        incidents: verifiedIncidents,
      };
    } catch {
      // Fallback below
    }
  }

  // Fallback to baseline mock data if empty
  if (announcements.length === 0 && upcomingEvents.length === 0) {
    INITIAL_POSTS.forEach((post) => {
      if (post.status !== 'active') return;
      if (post.category === 'announcement' && announcements.length < 4) {
        announcements.push({
          id: post.id,
          title: post.title,
          content: post.content.slice(0, 140),
          date: post.createdAt,
        });
      } else if (post.category === 'event' && upcomingEvents.length < 5) {
        upcomingEvents.push({
          id: post.id,
          title: post.title,
          date: post.eventDate,
          time: post.eventTime,
          venue: post.eventVenue,
          description: post.content.slice(0, 120),
        });
      }
    });

    if (exchangeListings.length === 0) {
      exchangeListings = INITIAL_EXCHANGE_ITEMS
        .filter((item) => item.status === 'available' || item.status === 'reserved')
        .slice(0, isGeneral ? 3 : 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          type: item.listingType || 'giveaway',
          category: item.category,
          condition: item.condition,
          precinct: item.precinct,
        }));
    }

    if (localServices.length === 0) {
      localServices = INITIAL_SERVICES
        .filter((service) => service.status === 'active' || service.status === 'open')
        .slice(0, isGeneral ? 3 : 5)
        .map((service) => ({
          id: service.id,
          title: service.title,
          type: service.type,
          category: service.category,
          precinct: service.precinct,
          price: service.priceEstimate,
        }));
    }

    if (verifiedIncidents.length === 0) {
      verifiedIncidents = INITIAL_RESILIENCE_INCIDENTS
        .filter((inc) => inc.isVerified && !inc.isArchived)
        .slice(0, isGeneral ? 2 : 4)
        .map((inc) => ({
          id: inc.id,
          type: inc.incidentType || 'general',
          location: inc.locationName,
          severity: inc.severity,
          status: inc.status,
          description: inc.description.slice(0, 100),
        }));
    }
  }

  // Filter records based on specific keyword match if query seeks a particular service or exchange item
  const lowerQuery = query.toLowerCase();
  if (targetModules.has('services') && lowerQuery.includes('plumb')) {
    localServices = localServices.filter((s) => /plumb|paip/i.test(`${s.title} ${s.category}`));
  } else if (targetModules.has('services') && lowerQuery.includes('tutor')) {
    localServices = localServices.filter((s) => /tutor|tuition|kelas/i.test(`${s.title} ${s.category}`));
  }

  // Assemble concise, targeted context string
  const sections: string[] = [];

  // Core township info
  sections.push(`Township: Bandar Elmina / Denai Alam (Shah Alam). Emergency Polis Bantuan (24/7): 03-7845 2222.`);

  // If incident related query, include compact 3-step reporting guide
  if (targetModules.has('incidents') || lowerQuery.includes('report') || lowerQuery.includes('lapor')) {
    sections.push(`Reporting on [Resilience Map]: 1. Click "+ Report Incident". 2. Select category (Flood, Blocked Drain, Fallen Tree, Pothole, Street Light, Water). 3. Pin location, add photo/details, and optionally submit anonymously. Reports require JMB verification before township alerts.`);
  }

  // Include only relevant modules (or top 2-3 per module if general)
  if ((targetModules.has('notices') || isGeneral) && announcements.length > 0) {
    const list = announcements.slice(0, isGeneral ? 2 : 4).map((a) => 
      `- [${a.title}] (ID: ${a.id}): ${a.content.replace(/\s+/g, ' ')}`
    ).join('\n');
    sections.push(`[Notices & Announcements]\n${list}`);
  }

  if ((targetModules.has('events') || isGeneral) && upcomingEvents.length > 0) {
    const list = upcomingEvents.slice(0, isGeneral ? 3 : 5).map((e) => 
      `- [${e.title}] (ID: ${e.id}): ${e.date || 'Upcoming'}, ${e.time || ''} at ${e.venue || 'Elmina'}. ${e.description.replace(/\s+/g, ' ')}`
    ).join('\n');
    sections.push(`[Upcoming Events]\n${list}`);
  }

  if ((targetModules.has('exchange') || isGeneral) && exchangeListings.length > 0) {
    const list = exchangeListings.slice(0, isGeneral ? 2 : 4).map((ex) => 
      `- [${ex.title}] (ID: ${ex.id}): ${ex.type.toUpperCase()}, ${ex.category}, ${ex.condition}, Precinct: ${ex.precinct}`
    ).join('\n');
    sections.push(`[Circular Exchange]\n${list}`);
  }

  if ((targetModules.has('services') || isGeneral) && localServices.length > 0) {
    const list = localServices.slice(0, isGeneral ? 2 : 4).map((s) => 
      `- [${s.title}] (ID: ${s.id}): ${s.category}, Precinct: ${s.precinct}${s.price ? `, Fee: ${s.price}` : ''}`
    ).join('\n');
    sections.push(`[Local Services]\n${list}`);
  }

  if ((targetModules.has('incidents') || isGeneral) && verifiedIncidents.length > 0) {
    const list = verifiedIncidents.slice(0, isGeneral ? 2 : 4).map((inc) => 
      `- [${inc.location} - ${inc.type.toUpperCase()}] (ID: ${inc.id}): Severity: ${inc.severity}, Status: ${inc.status}. ${inc.description.replace(/\s+/g, ' ')}`
    ).join('\n');
    sections.push(`[Resilience Map]\n${list}`);
  } else if (targetModules.has('incidents') || isGeneral) {
    sections.push(`[Resilience Map]\nNo active verified critical hazards in Bandar Elmina at this time.`);
  }

  return sections.join('\n\n');
}
