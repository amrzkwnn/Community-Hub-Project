import { 
  INITIAL_POSTS, 
  INITIAL_EXCHANGE_ITEMS, 
  INITIAL_SERVICES, 
  INITIAL_RESILIENCE_INCIDENTS 
} from '../data/mockData.ts';
import type { 
  CircularExchangeItem, 
  ResilienceIncident, 
  LocalService, 
  CommunityPost, 
  AiSearchResultCard,
  UserProfile,
  IncidentType
} from '../../types/index.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

// Landmark reference coordinates for Elmina to verify geographic distance when applicable
export const ELMINA_LANDMARKS: Record<string, { lat: number; lng: number; name: string }> = {
  rainbow_bridge: { lat: 3.179321, lng: 101.516512, name: 'Elmina Rainbow Bridge / Persiaran Elmina' },
  central_park: { lat: 3.180500, lng: 101.515200, name: 'Elmina Central Park & Lakeside' },
  west_wetland: { lat: 3.183400, lng: 101.509800, name: 'Elmina West Wetland Retention Pond' },
  denai_alam: { lat: 3.174120, lng: 101.521840, name: 'Denai Alam Connector' },
  elmina_green: { lat: 3.181200, lng: 101.514200, name: 'Elmina Green 1 / 3' },
  elmina_valley: { lat: 3.178000, lng: 101.512000, name: 'Elmina Valley' },
};

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Multilingual term dictionary for Exchange item matching
const EXCHANGE_SYNONYMS: Record<string, string[]> = {
  chair: ['chair', 'chairs', 'kerusi', 'dining chair', 'dining chairs', 'high chair', 'seat', 'armchair', 'stool'],
  sofa: ['sofa', 'sofas', 'couch', 'couches', 'kerusi rehat', 'setee', 'kusyen', 'cushion'],
  bicycle: ['bicycle', 'bicycles', 'bike', 'bikes', 'basikal', 'cycling', 'mountain bike', 'road bike'],
  table: ['table', 'tables', 'desk', 'desks', 'meja', 'dining table', 'dining tables', 'study desk'],
  stroller: ['stroller', 'strollers', 'pram', 'nitro', 'kereta sorong'],
  coffee: ['coffee', 'espresso', 'kopi', 'machine', 'dedica', 'delonghi'],
  plant: ['plant', 'plants', 'pokok', 'bunga', 'sapling', 'saplings', 'curry leaf', 'bougainvillea'],
  ladder: ['ladder', 'ladders', 'tangga', 'telescopic', 'aluminium'],
  book: ['book', 'books', 'buku', 'novel', 'novels', 'textbook', 'textbooks'],
};

/**
 * Smart Search for Circular Exchange Listings.
 */
export async function searchExchangeListings(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    maxResults?: number;
  } = {}
): Promise<AiSearchResultCard[]> {
  const maxResults = options.maxResults || 4;
  const qLower = query.toLowerCase();

  // Load items from Supabase or verified mock data
  let items: CircularExchangeItem[] = [];
  if (options.supabase) {
    try {
      const { data } = await options.supabase
        .from('exchange_listings')
        .select('*')
        .is('deleted_at', null)
        .in('status', ['available', 'reserved'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        items = data as CircularExchangeItem[];
      }
    } catch {
      // Fallback below
    }
  }

  if (items.length === 0) {
    items = INITIAL_EXCHANGE_ITEMS.filter((i) => i.status !== 'completed');
  }

  // Detect filters
  const wantsFree = /free|percuma|giveaway|sedekah/i.test(qLower);
  const wantsExchange = /exchange|tukar|barter/i.test(qLower);
  const wantsUsed = /used|terpakai|preloved|second\s*hand/i.test(qLower);

  // Extract price ceiling if specified (e.g. "under RM 200", "below 100")
  const priceMatch = qLower.match(/(?:under|below|less than|bawah|kurang dari)\s*(?:rm)?\s*(\d+)/i);
  const maxBudget = priceMatch ? parseInt(priceMatch[1], 10) : null;

  // Specific furniture intent discrimination
  const wantsTable = /\b(?:table|tables|meja|desk|desks)\b/i.test(qLower) && !/\b(?:chair|chairs|kerusi)\b/i.test(qLower);
  const wantsChair = /\b(?:chair|chairs|kerusi)\b/i.test(qLower) && !/\b(?:table|tables|meja|sofa|couch)\b/i.test(qLower);
  const wantsSofa = /\b(?:sofa|sofas|couch|couches)\b/i.test(qLower);

  // Find synonym groups matching query with exact word boundaries
  const matchedTokens: string[] = [];
  for (const [canonical, words] of Object.entries(EXCHANGE_SYNONYMS)) {
    if (words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(qLower))) {
      matchedTokens.push(canonical, ...words);
    }
  }

  // Tokenize user query with broad stop-word set including generic words like 'barang', 'any', 'are'
  const STOP_WORDS = new Set([
    'find', 'show', 'search', 'anyone', 'have', 'does', 'item', 'items', 'exchange',
    'the', 'for', 'ada', 'cari', 'sesiapa', 'jual', 'beli', 'under', 'below', 'less',
    'than', 'bawah', 'free', 'percuma', 'giveaway', 'sedekah', 'available', 'are',
    'there', 'any', 'barang', 'barangan', 'benda', 'terpakai', 'used', 'preloved',
    'looking', 'want', 'mau', 'hendak', 'nak', 'rumah', 'home', 'house', 'suitable', 'new'
  ]);
  const queryWords = qLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const hasSpecificKeyword = matchedTokens.length > 0 || queryWords.length > 0;

  const scored = items.map((item) => {
    let textualScore = 0;
    const titleLower = item.title.toLowerCase();
    const text = `${titleLower} ${item.description} ${item.category} ${item.seekingItem || ''}`.toLowerCase();

    // Check category matches
    if ((qLower.includes('furniture') || qLower.includes('perabot')) && (item.category === 'furniture' || titleLower.includes('chair') || titleLower.includes('sofa') || titleLower.includes('table') || titleLower.includes('desk'))) {
      textualScore += 15;
    }

    // Synonym match (prioritizing title)
    for (const token of matchedTokens) {
      if (titleLower.includes(token)) textualScore += 20;
      else if (text.includes(token)) textualScore += 6;
    }

    // Word match
    for (const word of queryWords) {
      if (titleLower.includes(word)) textualScore += 15;
      else if (text.includes(word)) textualScore += 4;
    }

    // Avoid matching sofas for chair queries
    if (wantsChair && /sofa|couch/i.test(titleLower)) {
      return { item, score: 0 };
    }

    // If user specifically asked for tables/desks, title must contain table/desk/meja
    if (wantsTable && !/\b(?:table|tables|meja|desk|desks)\b/i.test(titleLower)) {
      return { item, score: 0 };
    }

    // Avoid matching tables when specifically searching for chairs
    if (wantsChair && /\b(?:table|tables|meja|desk|desks)\b/i.test(titleLower) && !/\b(?:chair|chairs|kerusi)\b/i.test(titleLower)) {
      return { item, score: 0 };
    }

    // If specific terms were searched but this item doesn't match any, exclude it
    if (hasSpecificKeyword && textualScore === 0) {
      return { item, score: 0 };
    }

    // If user explicitly asked for free items, strictly require giveaway
    if (wantsFree && item.listingType !== 'giveaway') {
      return { item, score: 0 };
    }

    let score = textualScore;

    // Type filter match
    if (wantsFree && item.listingType === 'giveaway') {
      score += 20;
    } else if (wantsExchange && item.listingType === 'exchange') {
      score += 5;
    }

    // Used / terpakai condition bonus
    if (wantsUsed && (item.condition === 'good' || item.condition === 'fair' || item.condition === 'like_new')) {
      score += 10;
    }

    // Price ceiling: Giveaways have RM 0 cost, matching "under RM X"
    if (maxBudget !== null) {
      if (item.listingType === 'giveaway') {
        score += 8;
      }
    }

    // Available items prioritized over reserved
    if (item.status === 'available') {
      score += 3;
    }

    return { item, score };
  });

  const matching = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.item);

  return matching.map((item) => {
    const isGiveaway = item.listingType === 'giveaway';
    const priceLabel = isGiveaway
      ? 'Free Giveaway'
      : item.seekingItem
      ? `Exchange: ${item.seekingItem.slice(0, 36)}`
      : 'Item Exchange';

    let matchReason = isGiveaway
      ? 'Free neighbourhood giveaway available for porch pickup.'
      : item.seekingItem
      ? `Available for direct barter / trade: ${item.seekingItem.slice(0, 36)}.`
      : 'Community exchange listing matching your search criteria.';

    if (wantsChair && /chair|kerusi/i.test(item.title)) {
      matchReason = isGiveaway
        ? 'Free ergonomic chair ready for immediate porch pickup.'
        : 'Second-hand ergonomic chair in verified good condition.';
    } else if (wantsTable && /table|desk|meja/i.test(item.title)) {
      matchReason = 'Study desk suitable for home office or student room.';
    } else if (item.category === 'furniture' && /furniture|perabot/i.test(qLower)) {
      matchReason = isGiveaway
        ? 'Complimentary preloved furniture passing forward to neighbours.'
        : 'Affordable study and living furniture within Elmina.';
    }

    return {
      id: item.id,
      type: 'exchange',
      title: item.title,
      subtitle: `${item.category.replace('_', ' ').toUpperCase()} • ${item.condition.replace('_', ' ')}`,
      category: item.category,
      status: item.status === 'available' ? 'Available' : 'Reserved',
      price: priceLabel,
      location: item.precinct,
      thumbnail: item.imageUrl || (item.imageUrls && item.imageUrls[0]),
      descriptionSnippet: item.description.length > 100 ? `${item.description.slice(0, 97)}...` : item.description,
      matchReason,
      navigationTarget: {
        tab: 'exchange',
        itemId: item.id,
        itemType: 'exchange',
      },
      actionLabel: 'View Item Details',
    };
  });
}

/**
 * Smart Search for Resilience Incidents by Street, Area, or Category.
 */
export async function searchIncidents(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    maxResults?: number;
  } = {}
): Promise<AiSearchResultCard[]> {
  const maxResults = options.maxResults || 4;
  const qLower = query.toLowerCase();

  let incidents: ResilienceIncident[] = [];
  if (options.supabase) {
    try {
      const { data } = await options.supabase
        .from('community_reports')
        .select('*')
        .neq('status', 'pending')
        .neq('status', 'rejected')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        incidents = data.map((d: any) => ({
          id: d.id,
          reporterId: d.reporter_id || 'user-unknown',
          reporterName: d.is_anonymous ? 'Anonymous Neighbour' : 'Resident',
          reporterPrecinct: 'Bandar Elmina',
          incidentType: d.report_type || 'flood',
          title: d.title,
          description: d.description || '',
          locationName: d.location_name || 'Bandar Elmina',
          latitude: Number(d.latitude) || 3.1802,
          longitude: Number(d.longitude) || 101.5165,
          severity: d.severity || 'medium',
          status: d.status || 'reported',
          isVerified: d.status === 'under_review' || d.status === 'resolved' || d.status === 'dispatched',
          imageUrl: d.image_url,
          isAnonymous: !!d.is_anonymous,
          managementNotes: d.management_notes,
          assignedTeam: d.assigned_team,
          updates: [],
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || d.created_at || new Date().toISOString(),
        })) as ResilienceIncident[];
      }
    } catch {
      // Fallback below
    }
  }

  if (incidents.length === 0) {
    incidents = INITIAL_RESILIENCE_INCIDENTS.filter((i) => !i.isArchived && i.status !== 'resolved' && i.status !== 'pending' && i.status !== 'rejected');
  }

  // Location extraction
  let targetLandmark: { lat: number; lng: number; name: string } | null = null;
  let streetKeyword = '';

  if (/rainbow bridge|jambatan pelangi|persiaran elmina/i.test(qLower)) {
    targetLandmark = ELMINA_LANDMARKS.rainbow_bridge;
    streetKeyword = 'persiaran elmina';
  } else if (/wetland|retention pond|kolam takungan|elmina west/i.test(qLower)) {
    targetLandmark = ELMINA_LANDMARKS.west_wetland;
    streetKeyword = 'elmina west';
  } else if (/denai alam|connector|ridge/i.test(qLower)) {
    targetLandmark = ELMINA_LANDMARKS.denai_alam;
    streetKeyword = 'denai alam';
  } else if (/elmina green|jalan eg|jalan elmina/i.test(qLower)) {
    targetLandmark = ELMINA_LANDMARKS.elmina_green;
    streetKeyword = 'elmina green';
  } else if (/elmina valley/i.test(qLower)) {
    targetLandmark = ELMINA_LANDMARKS.elmina_valley;
    streetKeyword = 'elmina valley';
  }

  // Category keywords
  const isFlood = /\b(flood|flooding|floods)\b|banjir/i.test(qLower);
  const isDrain = /\b(drain|drains)\b|longkang|culvert/i.test(qLower);
  const isTree = /\b(tree|trees)\b|pokok|branch|dahan/i.test(qLower);
  const isPothole = /\b(road|roads|pothole|potholes)\b|jalan|lubang|masalah jalan|kerosakan jalan|jalan rosak|tar rosak|rosak/i.test(qLower);
  const isStreetlight = /\b(light|lights|lamp|lamps|streetlight|streetlights)\b|lampu/i.test(qLower);
  const hasCategoryFilter = isFlood || isDrain || isTree || isPothole || isStreetlight;
  
  const wantsUnresolved = /unresolved|active|belum selesai|aktif/i.test(qLower);
  const wantsVerified = /verified|disahkan|auxiliary police|management|pengurusan/i.test(qLower);

  const scored = incidents.map((inc) => {
    let score = 0;
    const locLower = (inc.locationName || '').toLowerCase();
    const titleLower = (inc.title || '').toLowerCase();
    const descLower = (inc.description || '').toLowerCase();
    const allText = `${locLower} ${titleLower} ${descLower} ${inc.incidentType}`;

    // Verification requirement
    if (wantsVerified && !inc.isVerified) {
      return { inc, score: 0, distanceMeters: null };
    }

    // Street / Area matching
    let matchedLocation = false;
    if (streetKeyword && (locLower.includes(streetKeyword) || allText.includes(streetKeyword))) {
      score += 20;
      matchedLocation = true;
    } else if (/jalan elmina|persiaran elmina/i.test(qLower) && (locLower.includes('elmina') || locLower.includes('persiaran elmina'))) {
      score += 15;
      matchedLocation = true;
    }

    // Geographic Proximity Calculation
    let distanceMeters: number | null = null;
    if (targetLandmark && inc.latitude && inc.longitude) {
      distanceMeters = calculateHaversineDistance(
        targetLandmark.lat,
        targetLandmark.lng,
        inc.latitude,
        inc.longitude
      );
      if (distanceMeters < 1000) {
        score += 12;
        matchedLocation = true;
      } else if (distanceMeters < 2500) {
        score += 6;
      }
    }

    // Category matching
    let matchedCategory = false;
    if (isFlood && inc.incidentType === 'flood') { score += 25; matchedCategory = true; }
    if (isDrain && inc.incidentType === 'blocked_drain') { score += 25; matchedCategory = true; }
    if (isTree && inc.incidentType === 'fallen_tree') { score += 25; matchedCategory = true; }
    if (isPothole && (inc.incidentType === 'pothole' || allText.includes('pothole') || allText.includes('asphalt') || allText.includes('road'))) { score += 25; matchedCategory = true; }
    if (isStreetlight && (inc.incidentType === 'street_light' || allText.includes('streetlight') || allText.includes('lamp'))) { score += 25; matchedCategory = true; }

    // If a specific category was searched and this does not match, exclude
    if (hasCategoryFilter && !matchedCategory) {
      return { inc, score: 0, distanceMeters };
    }

    // If user asked for an area/street and this didn't match location or category
    if (!hasCategoryFilter && (streetKeyword || targetLandmark) && !matchedLocation) {
      return { inc, score: 0, distanceMeters };
    }

    // If general query without specific filter
    if (score === 0 && !hasCategoryFilter && !streetKeyword) {
      score = 5;
    }

    if (wantsUnresolved && (inc.status === 'dispatched' || inc.status === 'under_review' || inc.status === 'reported')) {
      score += 5;
    }

    // Verified incidents are prioritized
    if (inc.isVerified) score += 3;

    return { inc, score, distanceMeters };
  });

  const matching = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return matching.map(({ inc, distanceMeters }) => {
    let locationLabel = inc.locationName;
    if (distanceMeters !== null) {
      locationLabel = `${inc.locationName} (~${distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`} radius)`;
    }

    const typeName = inc.incidentType.replace('_', ' ').toUpperCase();

    return {
      id: inc.id,
      type: 'incident',
      title: inc.title,
      subtitle: `${typeName} • Severity: ${inc.severity.toUpperCase()}`,
      category: typeName,
      status: inc.isVerified ? 'Verified by Management' : 'Unverified Resident Report',
      isVerified: inc.isVerified,
      location: locationLabel,
      date: inc.createdAt ? new Date(inc.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent',
      descriptionSnippet: inc.description.length > 110 ? `${inc.description.slice(0, 107)}...` : inc.description,
      navigationTarget: {
        tab: 'resilience',
        itemId: inc.id,
        itemType: 'incident',
      },
      actionLabel: 'View Incident on Map',
    };
  });
}

/**
 * Smart Search for Local Services & Requests for Help.
 */
export async function searchLocalServices(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    maxResults?: number;
  } = {}
): Promise<AiSearchResultCard[]> {
  const maxResults = options.maxResults || 4;
  const qLower = query.toLowerCase();

  let services: LocalService[] = [];
  if (options.supabase) {
    try {
      const { data } = await options.supabase
        .from('service_listings')
        .select('*')
        .is('deleted_at', null)
        .in('status', ['active', 'open'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        services = data as LocalService[];
      }
    } catch {
      // Fallback below
    }
  }

  if (services.length === 0) {
    services = INITIAL_SERVICES.filter((s) => s.status === 'active' || s.status === 'open');
  }

  // Detect query focus
  const wantsRequests = /need help|looking for|mencari|bantuan|tolong|perlu bantuan/i.test(qLower);
  const isPlumbing = /plumb|paip|pipe|sink|bocor|leaking|toilet/i.test(qLower);
  const isAircon = /aircond|air[ -]?conditioner|penyaman udara|cooling|compressor/i.test(qLower);
  const isElectric = /electric|elektrik|wiring|fuse|power|tukang elektrik|wireman/i.test(qLower);
  const isCleaning = /clean|cuci|kemas|pressure wash/i.test(qLower);
  const isTutor = /tutor|tuition|tuisyen|math|physics|kelas|mengajar|spm/i.test(qLower);
  const isGarden = /garden|kebun|soil|rumput/i.test(qLower);
  const isChildcare = /childcare|babysit|kanak-kanak|jaga anak/i.test(qLower);
  const isMoving = /moving|pindah|lorry|carry|angkat|furniture|sofa/i.test(qLower);
  const isAssembly = /assembl|pasang|drill|wardrobe|almari|bookshelf|perabot|rak/i.test(qLower);
  const isTech = /wifi|network|router|unifi|cctv/i.test(qLower);
  const hasSpecificService = isPlumbing || isAircon || isElectric || isCleaning || isTutor || isGarden || isChildcare || isMoving || isAssembly || isTech;

  // Budget detection (e.g. "under RM100", "bawah RM50", "budget 80")
  const budgetMatch = qLower.match(/(?:under|below|max|budget|bawah|kurang dari)\s*(?:rm)?\s*(\d+)/i);
  const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

  const queryTerms = qLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['find', 'show', 'search', 'anyone', 'have', 'does', 'service', 'services', 'perkhidmatan', 'servis', 'near', 'the', 'for', 'ada', 'cari', 'sesiapa', 'tolong', 'bantuan', 'need', 'help', 'repair', 'baiki', 'membaiki', 'someone'].includes(w));

  const hasSpecificQueryTerms = queryTerms.length > 0;

  const scored = services.map((s) => {
    let score = 0;
    const titleLower = s.title.toLowerCase();
    const descLower = s.description.toLowerCase();

    let matchedService = false;
    if (isPlumbing) {
      if (titleLower.includes('plumb') || titleLower.includes('paip') || titleLower.includes('pipe')) {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('plumb') || descLower.includes('pipe leak') || descLower.includes('sink trap') || descLower.includes('cistern')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isAircon) {
      if (titleLower.includes('aircond') || titleLower.includes('air conditioner') || titleLower.includes('penyaman udara')) {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('air conditioning') || descLower.includes('inverter') || descLower.includes('chemical overhaul')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isElectric) {
      if (titleLower.includes('electric') || titleLower.includes('elektrik') || titleLower.includes('wiring') || titleLower.includes('wireman') || titleLower.includes('db box')) {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('electrical wiring') || descLower.includes('db box') || descLower.includes('rccb') || descLower.includes('lighting circuit') || descLower.includes('certified wireman')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isCleaning) {
      if (titleLower.includes('wash') || titleLower.includes('cuci') || titleLower.includes('cleaning') || s.category === 'cleaning') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('pressure wash') || descLower.includes('cleaning')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isTutor) {
      if (titleLower.includes('tutor') || titleLower.includes('tuition') || titleLower.includes('tuisyen') || s.category === 'tutoring') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('math') || descLower.includes('physics') || descLower.includes('educator') || descLower.includes('spm')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isGarden) {
      if (titleLower.includes('garden') || titleLower.includes('kebun') || titleLower.includes('compost') || s.category === 'gardening') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('soil') || descLower.includes('fertilizer') || descLower.includes('herbs')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isChildcare) {
      if (titleLower.includes('childcare') || titleLower.includes('babysit') || s.category === 'childcare') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('play') || descLower.includes('story-time')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isMoving) {
      if (titleLower.includes('moving') || titleLower.includes('pindah') || titleLower.includes('lorry') || titleLower.includes('sofa') || s.category === 'moving') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('carry') || descLower.includes('transport') || descLower.includes('sofa')) {
        score += 20;
        matchedService = true;
      }
    }
    if (isAssembly) {
      if (titleLower.includes('assembl') || titleLower.includes('pasang') || titleLower.includes('bookshelf') || titleLower.includes('wardrobe')) {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('assembl') || descLower.includes('drill') || descLower.includes('screwdriver') || descLower.includes('perabot')) {
        score += 25;
        matchedService = true;
      }
    }
    if (isTech) {
      if (titleLower.includes('wifi') || titleLower.includes('network') || titleLower.includes('mesh') || s.category === 'tech_help') {
        score += 40;
        matchedService = true;
      } else if (descLower.includes('router') || descLower.includes('cctv')) {
        score += 20;
        matchedService = true;
      }
    }

    let queryTermMatch = false;
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        score += 25;
        queryTermMatch = true;
      } else if (descLower.includes(term)) {
        score += 15;
        queryTermMatch = true;
      }
    }

    // Exclude if user asked for a specific service category and this does not match
    if (hasSpecificService && !matchedService) {
      return { service: s, score: 0 };
    }

    // Exclude if user asked for specific query terms and neither category nor term matched
    if (!hasSpecificService && hasSpecificQueryTerms && !queryTermMatch) {
      return { service: s, score: 0 };
    }

    if (!hasSpecificService && !hasSpecificQueryTerms) {
      score = 5;
    }

    // Budget affinity bonus
    if (maxBudget !== null) {
      const priceNumbers = (s.priceEstimate || '').match(/\d+/g);
      if (priceNumbers && priceNumbers.length > 0) {
        const minPrice = Math.min(...priceNumbers.map(Number));
        if (minPrice <= maxBudget) {
          score += 20;
        } else if (minPrice > maxBudget * 1.5) {
          score -= 15;
        }
      }
    }

    // Type preference
    if (wantsRequests && s.type === 'requesting') score += 15;
    if (!wantsRequests && s.type === 'offering') score += 10;

    return { service: s, score };
  });

  const matching = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.service);

  return matching.map((service) => {
    const isRequest = service.type === 'requesting';
    let matchReason = isRequest
      ? 'Verified community help request from a neighbouring resident.'
      : 'Active local service provider in Bandar Elmina.';

    if (isPlumbing && (service.title.toLowerCase().includes('plumb') || service.title.toLowerCase().includes('paip') || service.description.toLowerCase().includes('leak'))) {
      matchReason = 'Specialized in pipe leak repairs, sanitary traps, and rapid emergency plumbing.';
    } else if (isAircon && (service.title.toLowerCase().includes('aircond') || service.description.toLowerCase().includes('chemical') || service.description.toLowerCase().includes('air conditioning'))) {
      matchReason = 'Certified air conditioning overhaul and inverter maintenance in the township.';
    } else if (isCleaning && (service.category === 'cleaning' || service.title.toLowerCase().includes('wash'))) {
      matchReason = 'High-pressure exterior driveway and patio washing from a verified neighbour.';
    } else if (isMoving && (service.category === 'moving' || service.title.toLowerCase().includes('carry') || service.title.toLowerCase().includes('sofa') || service.title.toLowerCase().includes('pindah'))) {
      matchReason = 'Community mutual aid request for furniture moving and heavy lifting.';
    } else if (isAssembly && (service.title.toLowerCase().includes('assembl') || service.description.toLowerCase().includes('bookshelf') || service.description.toLowerCase().includes('ikea'))) {
      matchReason = 'Open mutual-aid request for furniture assembly and handyman assistance.';
    } else if (isTutor && (service.category === 'tutoring' || service.title.toLowerCase().includes('math'))) {
      matchReason = 'Experienced resident tutor available for secondary mathematics and science.';
    } else if (isElectric && (service.category === 'home_services' || service.title.toLowerCase().includes('wireman') || service.title.toLowerCase().includes('db box'))) {
      matchReason = 'Certified PW4 wireman for DB box diagnostics, lighting, and surge trips.';
    }

    return {
      id: service.id,
      type: isRequest ? 'request' : 'service',
      title: service.title,
      subtitle: `${service.category.replace('_', ' ').toUpperCase()} • ${isRequest ? 'Help Request' : 'Service Offering'}`,
      category: service.category,
      status: service.status === 'active' || service.status === 'open' ? 'Active' : 'In Progress',
      price: service.priceEstimate || service.compensationPreference || 'Contact Provider',
      location: service.precinct,
      thumbnail: service.imageUrl,
      descriptionSnippet: service.description.length > 100 ? `${service.description.slice(0, 97)}...` : service.description,
      matchReason,
      navigationTarget: {
        tab: 'services',
        subTab: isRequest ? 'requests' : 'services',
        itemId: service.id,
        itemType: 'service',
      },
      actionLabel: isRequest ? 'View Help Request' : 'View Service',
    };
  });
}

/**
 * Smart Search for Upcoming Events.
 */
export async function searchUpcomingEvents(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    maxResults?: number;
  } = {}
): Promise<AiSearchResultCard[]> {
  const maxResults = options.maxResults || 4;

  let posts: CommunityPost[] = [];
  if (options.supabase) {
    try {
      const { data } = await options.supabase
        .from('community_posts')
        .select('*')
        .eq('category', 'event')
        .is('deleted_at', null)
        .order('event_date', { ascending: true })
        .limit(10);
      if (data && data.length > 0) {
        posts = data as CommunityPost[];
      }
    } catch {
      // Fallback below
    }
  }

  if (posts.length === 0) {
    posts = INITIAL_POSTS.filter((p) => p.category === 'event' && p.status === 'active');
  }

  // Filter and rank events
  const qTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = posts.map((event) => {
    let score = 5;
    const txt = `${event.title} ${event.content} ${event.eventVenue || ''}`.toLowerCase();
    for (const term of qTerms) {
      if (txt.includes(term)) score += 5;
    }
    return { event, score };
  });

  const events = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.event);

  return events.map((event) => {
    let dateStr = event.eventDate || 'Upcoming';
    if (event.eventDate) {
      try {
        const d = new Date(event.eventDate);
        dateStr = d.toLocaleDateString('en-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        if (event.eventTime) dateStr += ` • ${event.eventTime}`;
      } catch {
        dateStr = event.eventDate;
      }
    }

    return {
      id: event.id,
      type: 'event',
      title: event.title,
      subtitle: `Community Event • ${event.eventVenue || 'Elmina'}`,
      category: 'Community Activity',
      status: 'Published',
      location: event.eventVenue || 'Bandar Elmina',
      date: dateStr,
      thumbnail: event.imageUrl,
      descriptionSnippet: event.content.length > 105 ? `${event.content.slice(0, 102)}...` : event.content,
      navigationTarget: {
        tab: 'home',
        itemId: event.id,
        itemType: 'post',
      },
      actionLabel: 'View Event',
    };
  });
}

export interface IncidentReportingAssistance {
  isReportingIntent: boolean;
  suggestedCategory: IncidentType | null;
  suggestedCategoryLabel: string | null;
  draftTitle: string | null;
  draftDescription: string | null;
  detectedLocationName?: string;
  detectedCoordinates?: { lat: number; lng: number };
  duplicates: AiSearchResultCard[];
  draftCard: AiSearchResultCard | null;
}

/**
 * AI-Assisted Incident Reporting:
 * Recognizes resident intent to report an issue, suggests the actual TESDH category,
 * crafts a factual non-hallucinated description draft, detects duplicates,
 * and pre-fills the existing map-first reporting flow without auto-submitting.
 */
export async function analyzeIncidentReportIntent(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    preferredLanguage?: string;
  } = {}
): Promise<IncidentReportingAssistance> {
  const qLower = query.toLowerCase().trim();
  const isMalay = options.preferredLanguage === 'bm' || options.preferredLanguage === 'ms-MY' || 
    /saya|jumpa|nampak|lapor|tolong|pokok|lampu|longkang|lubang|banjir|kat|dekat|ada pokok|ada lampu|ada kerosakan/i.test(qLower);

  // Exclude read-only search inquiries (e.g. "Is there any incident near...", "Show unresolved...", "Find verified...", "Ada sebarang laporan...?")
  const isPureSearchQuery = /^(?:is\s+there\s+any|are\s+there\s+any|show\s+|find\s+|search\s+|list\s+|any\s+|what\s+are|check\s+|ada\s+(?:sebarang\s+|laporan\s+)?(?:kejadian|masalah|insiden)|tunjukkan|senaraikan|cari)\b/i.test(qLower);

  const hasReportingPhrase = /(?:i\s+(?:found|saw|noticed|spotted|want\s+to\s+report|need\s+to\s+report)|there\s+(?:is|are|'s)\s+(?:a|an)?|report\s+(?:an?\s+)?(?:incident|issue|problem|hazard)|broken|damaged|clogged|fallen\s+tree|pothole\s+at)\b/i.test(qLower) ||
    /(?:saya\s+(?:jumpa|nampak)|terdapat\s+(?:pokok|lampu|longkang|lubang|banjir)|nak\s+lapor|ingin\s+lapor|lapor\s+(?:kerosakan|masalah|kejadian|insiden)|tolong\s+lapor)/i.test(qLower);

  // If query is an inquiry and not reporting an observed issue
  if (isPureSearchQuery && !hasReportingPhrase) {
    return {
      isReportingIntent: false,
      suggestedCategory: null,
      suggestedCategoryLabel: null,
      draftTitle: null,
      draftDescription: null,
      duplicates: [],
      draftCard: null,
    };
  }

  const isHazardStatement = /broken\s+(?:streetlight|light|lamp)|pothole|fallen\s+tree|blocked\s+drain|flash\s+flood|water\s+disruption|lampu\s+jalan\s+rosak|pokok\s+tumbang|longkang\s+tersumbat|jalan\s+berlubang|banjir\s+kilat|bekalan\s+air\s+terputus/i.test(qLower);

  if (!hasReportingPhrase && !isHazardStatement) {
    return {
      isReportingIntent: false,
      suggestedCategory: null,
      suggestedCategoryLabel: null,
      draftTitle: null,
      draftDescription: null,
      duplicates: [],
      draftCard: null,
    };
  }

  // 1. Map to official TESDH Incident Categories
  let suggestedCategory: IncidentType = 'other';
  let suggestedCategoryLabel = isMalay ? 'Bahaya Perbandaran' : 'Township Hazard';

  if (/street\s*light|lamp|lighting|lampu/i.test(qLower)) {
    suggestedCategory = 'street_light';
    suggestedCategoryLabel = isMalay ? 'Gangguan Lampu Jalan & Taman' : 'Street & Park Lighting Outage';
  } else if (/flood|flooding|water\s+rising|banjir|takungan\s+air/i.test(qLower)) {
    suggestedCategory = 'flood';
    suggestedCategoryLabel = isMalay ? 'Saliran & Takungan / Banjir' : 'Drainage & Hydrology / Flood';
  } else if (/drain|culvert|longkang|parit/i.test(qLower)) {
    suggestedCategory = 'blocked_drain';
    suggestedCategoryLabel = isMalay ? 'Longkang Tersumbat / Sisa' : 'Blocked Drain / Waste';
  } else if (/tree|branch|pokok|dahan|ranting/i.test(qLower)) {
    suggestedCategory = 'fallen_tree';
    suggestedCategoryLabel = isMalay ? 'Pokok Tumbang & Halangan Laluan' : 'Fallen Tree & Trail Obstruction';
  } else if (/pothole|road|asphalt|surface|lubang|jalan\s+(?:rosak|berlubang)|tar\s+rosak/i.test(qLower)) {
    suggestedCategory = 'pothole';
    suggestedCategoryLabel = isMalay ? 'Permukaan Jalan & Lubang Jalan' : 'Road Surface & Pavement Hazard';
  } else if (/water\s+supply|water\s+disruption|air\s+terputus|paip\s+pecah|tiada\s+air/i.test(qLower)) {
    suggestedCategory = 'water_disruption';
    suggestedCategoryLabel = isMalay ? 'Gangguan Bekalan Air' : 'Water Supply Disruption';
  }

  // 2. Extract location / landmark
  let detectedLocationName = 'Persiaran Elmina';
  let detectedCoordinates: { lat: number; lng: number } = { lat: 3.1802, lng: 101.5165 };

  if (/rainbow bridge|jambatan pelangi/i.test(qLower)) {
    detectedLocationName = 'Elmina Rainbow Bridge';
    detectedCoordinates = ELMINA_LANDMARKS.rainbow_bridge;
  } else if (/central park|taman tasik|tasik/i.test(qLower)) {
    detectedLocationName = 'Elmina Central Park';
    detectedCoordinates = ELMINA_LANDMARKS.central_park;
  } else if (/wetland|retention pond|kolam|elmina west/i.test(qLower)) {
    detectedLocationName = 'Elmina West Wetland Retention Pond';
    detectedCoordinates = ELMINA_LANDMARKS.west_wetland;
  } else if (/denai alam|connector/i.test(qLower)) {
    detectedLocationName = 'Denai Alam Connector';
    detectedCoordinates = ELMINA_LANDMARKS.denai_alam;
  } else if (/elmina green|jalan eg/i.test(qLower)) {
    detectedLocationName = 'Elmina Green';
    detectedCoordinates = ELMINA_LANDMARKS.elmina_green;
  } else if (/elmina valley/i.test(qLower)) {
    detectedLocationName = 'Elmina Valley';
    detectedCoordinates = ELMINA_LANDMARKS.elmina_valley;
  } else if (/jalan elmina|persiaran elmina/i.test(qLower)) {
    detectedLocationName = 'Persiaran Elmina';
    detectedCoordinates = ELMINA_LANDMARKS.rainbow_bridge;
  }

  // 3. Factual Title & Description Draft
  let draftTitle = isMalay 
    ? `Laporan ${suggestedCategoryLabel} di ${detectedLocationName}`
    : `${suggestedCategoryLabel} near ${detectedLocationName}`;

  if (suggestedCategory === 'street_light') {
    draftTitle = isMalay ? `Kerosakan Lampu Jalan di ${detectedLocationName}` : `Broken Streetlight on ${detectedLocationName}`;
  } else if (suggestedCategory === 'fallen_tree') {
    draftTitle = isMalay ? `Pokok Tumbang di ${detectedLocationName}` : `Fallen Tree Obstruction on ${detectedLocationName}`;
  } else if (suggestedCategory === 'pothole') {
    draftTitle = isMalay ? `Lubang Jalan di ${detectedLocationName}` : `Road Pothole Hazard on ${detectedLocationName}`;
  } else if (suggestedCategory === 'flood') {
    draftTitle = isMalay ? `Limpahan Air Banjir di ${detectedLocationName}` : `Flooding Alert near ${detectedLocationName}`;
  } else if (suggestedCategory === 'blocked_drain') {
    draftTitle = isMalay ? `Longkang Tersumbat di ${detectedLocationName}` : `Blocked Drainage Culvert on ${detectedLocationName}`;
  }

  const cleanInput = query
    .replace(/^(?:i\s+(?:found|saw|noticed|spotted|want\s+to\s+report)|saya\s+(?:jumpa|nampak)|terdapat|ada|report\s+a|report\s+an|report)\s*/i, '')
    .trim();
  const draftDescription = isMalay
    ? `Aduan penduduk: "${cleanInput}". Diperhatikan di sekitar ${detectedLocationName}. Menunggu pengesahan lokasi tepat oleh penduduk di atas peta.`
    : `Resident report: "${cleanInput}". Observed near ${detectedLocationName}. Pending resident precise map location confirmation.`;

  // 4. Duplicate Incident Detection
  let activeIncidents: ResilienceIncident[] = [];
  if (options.supabase) {
    try {
      const { data } = await options.supabase
        .from('community_reports')
        .select('*')
        .neq('status', 'pending')
        .neq('status', 'rejected')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        activeIncidents = data.map((d: any) => ({
          id: d.id,
          reporterId: d.reporter_id || 'user-unknown',
          reporterName: d.is_anonymous ? 'Anonymous Neighbour' : 'Resident',
          reporterPrecinct: 'Bandar Elmina',
          incidentType: d.report_type || 'flood',
          title: d.title,
          description: d.description || '',
          locationName: d.location_name || 'Bandar Elmina',
          latitude: Number(d.latitude) || 3.1802,
          longitude: Number(d.longitude) || 101.5165,
          severity: d.severity || 'medium',
          status: d.status || 'reported',
          isVerified: d.status === 'under_review' || d.status === 'resolved' || d.status === 'dispatched',
          imageUrl: d.image_url,
          isAnonymous: !!d.is_anonymous,
          managementNotes: d.management_notes,
          assignedTeam: d.assigned_team,
          updates: [],
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || d.created_at || new Date().toISOString(),
        })) as ResilienceIncident[];
      }
    } catch {}
  }

  if (activeIncidents.length === 0) {
    activeIncidents = INITIAL_RESILIENCE_INCIDENTS.filter((i) => !i.isArchived && i.status !== 'resolved' && i.status !== 'pending' && i.status !== 'rejected');
  }

  const duplicates: AiSearchResultCard[] = [];
  for (const inc of activeIncidents) {
    const isCategoryMatch = inc.incidentType === suggestedCategory;
    const locLower = (inc.locationName || '').toLowerCase();
    const isLocationMatch = locLower.includes('elmina') ||
      (detectedLocationName && locLower.includes(detectedLocationName.toLowerCase())) ||
      (detectedCoordinates && inc.latitude && inc.longitude && calculateHaversineDistance(detectedCoordinates.lat, detectedCoordinates.lng, inc.latitude, inc.longitude) < 1200);

    const titleLower = inc.title.toLowerCase();
    const descLower = inc.description.toLowerCase();
    const isTextOverlap = (suggestedCategory === 'street_light' && (titleLower.includes('light') || titleLower.includes('lamp') || descLower.includes('dark'))) ||
      (suggestedCategory === 'pothole' && (titleLower.includes('pothole') || titleLower.includes('road') || descLower.includes('asphalt'))) ||
      (suggestedCategory === 'flood' && (titleLower.includes('flood') || titleLower.includes('water') || descLower.includes('water'))) ||
      (suggestedCategory === 'blocked_drain' && (titleLower.includes('drain') || descLower.includes('culvert'))) ||
      (suggestedCategory === 'fallen_tree' && (titleLower.includes('tree') || descLower.includes('branch')));

    if (isCategoryMatch && (isLocationMatch || isTextOverlap)) {
      duplicates.push({
        id: inc.id,
        type: 'incident',
        title: inc.title,
        subtitle: `${suggestedCategoryLabel} • Status: ${inc.status.toUpperCase()}`,
        category: suggestedCategoryLabel,
        status: inc.isVerified ? (isMalay ? 'Disahkan Pengurusan' : 'Verified by Management') : (isMalay ? 'Aduan Belum Disahkan' : 'Unverified Resident Report'),
        isVerified: inc.isVerified,
        location: inc.locationName,
        date: inc.createdAt ? new Date(inc.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active',
        descriptionSnippet: inc.description.length > 105 ? `${inc.description.slice(0, 102)}...` : inc.description,
        navigationTarget: {
          tab: 'resilience',
          itemId: inc.id,
          itemType: 'incident',
        },
        actionLabel: isMalay ? 'Lihat Laporan Sedia Ada' : 'View Existing Report',
      });
    }
  }

  // 5. Construct Interactive Incident Draft Card
  const draftCard: AiSearchResultCard = {
    id: `draft-incident-${Date.now()}`,
    type: 'incident_report_draft',
    title: draftTitle,
    subtitle: isMalay ? `Kategori Dicadangkan: ${suggestedCategoryLabel}` : `Suggested Category: ${suggestedCategoryLabel}`,
    category: suggestedCategoryLabel,
    status: isMalay ? 'Langkah 1-2: Sahkan di Peta' : 'Step 1-2: Review on Resilience Map',
    location: detectedLocationName,
    descriptionSnippet: draftDescription,
    navigationTarget: {
      tab: 'resilience',
      action: 'report_incident',
      prefill: {
        category: suggestedCategory,
        title: draftTitle,
        description: draftDescription,
        locationName: detectedLocationName,
        latitude: detectedCoordinates.lat,
        longitude: detectedCoordinates.lng,
      },
    },
    actionLabel: isMalay ? 'Lapor Insiden Ini' : 'Report This Incident',
  };

  return {
    isReportingIntent: true,
    suggestedCategory,
    suggestedCategoryLabel,
    draftTitle,
    draftDescription,
    detectedLocationName,
    detectedCoordinates,
    duplicates: duplicates.slice(0, 2),
    draftCard,
  };
}

/**
 * Master Search Orchestrator:
 * Executes targeted smart search across authorized TESDH modules based on query intent.
 */
export async function executeAiSmartSearch(
  query: string,
  options: {
    supabase?: SupabaseClient | null;
    currentUser?: UserProfile | null;
    preferredLanguage?: string;
  } = {}
): Promise<{ 
  cards: AiSearchResultCard[]; 
  detectedIntent: string | null;
  incidentReporting?: IncidentReportingAssistance;
}> {
  const q = query.trim().toLowerCase();
  const cards: AiSearchResultCard[] = [];
  let detectedIntent: string | null = null;

  // 1. First check if this query is an incident reporting flow
  const incidentReporting = await analyzeIncidentReportIntent(query, {
    supabase: options.supabase,
    preferredLanguage: options.preferredLanguage,
  });

  if (incidentReporting.isReportingIntent && incidentReporting.draftCard) {
    detectedIntent = 'incident_reporting';
    cards.push(incidentReporting.draftCard);
    if (incidentReporting.duplicates.length > 0) {
      cards.push(...incidentReporting.duplicates);
    }
    return { cards: cards.slice(0, 4), detectedIntent, incidentReporting };
  }

  // 2. Intent routing for standard community search
  const isExchangeIntent = /chair|kerusi|sofa|bicycle|basikal|bike|table|meja|stroller|coffee|plant|ladder|exchange|giveaway|percuma|tukar|barter|preloved|item|furniture|perabot|couch/i.test(q);
  const isIncidentIntent = /incident|insiden|hazard|flood|banjir|drain|longkang|tree|pokok|pothole|road|jalan|lamp|lampu|light|water|air terputus|near jalan|persiaran elmina|rainbow bridge|masalah jalan|kerosakan jalan|unresolved|rosak|streetlight/i.test(q);
  const isServiceIntent = /service|servis|perkhidmatan|plumb|paip|aircond|air conditioner|electric|elektrik|tutor|tuition|tuisyen|kebun|garden|childcare|cleaning|cuci|moving|pindah|wifi|baiki|repair|help/i.test(q);
  const isEventIntent = /event|acara|aktiviti|activity|gotong|weekend|minggu ini|tomorrow|esok|happening|calendar|kalendar/i.test(q);

  if (isExchangeIntent && !isIncidentIntent && !isServiceIntent && !isEventIntent) {
    detectedIntent = 'exchange';
    const exCards = await searchExchangeListings(query, { supabase: options.supabase });
    cards.push(...exCards);
  } else if (isIncidentIntent) {
    detectedIntent = 'incidents';
    const incCards = await searchIncidents(query, { supabase: options.supabase });
    cards.push(...incCards);
  } else if (isServiceIntent && !isExchangeIntent && !isIncidentIntent) {
    detectedIntent = 'services';
    const servCards = await searchLocalServices(query, { supabase: options.supabase });
    cards.push(...servCards);
  } else if (isEventIntent && !isIncidentIntent) {
    detectedIntent = 'events';
    const eventCards = await searchUpcomingEvents(query, { supabase: options.supabase });
    cards.push(...eventCards);
  } else if (isExchangeIntent) {
    detectedIntent = 'exchange';
    const exCards = await searchExchangeListings(query, { supabase: options.supabase });
    cards.push(...exCards);
  }

  return { cards: cards.slice(0, 4), detectedIntent, incidentReporting };
}
