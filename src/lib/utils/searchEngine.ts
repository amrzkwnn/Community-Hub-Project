import type { 
  CommunityPost, 
  PostReply, 
  ResilienceIncident, 
  CircularExchangeItem, 
  LocalService, 
  UserProfile,
  SearchResultItem,
} from '../../types/index.ts';

/**
 * Extracts a concise excerpt around the matched search terms.
 */
function createSnippet(text: string, query: string, maxLength: number = 100): string {
  if (!text) return '';
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lowerText = cleanText.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  // Find the earliest index of query or any query token
  const tokens = lowerQuery.split(/\s+/).filter(Boolean);
  let matchIndex = -1;
  let matchLen = lowerQuery.length;

  if (lowerText.includes(lowerQuery)) {
    matchIndex = lowerText.indexOf(lowerQuery);
  } else {
    for (const token of tokens) {
      const idx = lowerText.indexOf(token);
      if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
        matchIndex = idx;
        matchLen = token.length;
      }
    }
  }

  if (matchIndex === -1) {
    return cleanText.length <= maxLength ? cleanText : cleanText.substring(0, maxLength) + '...';
  }

  const start = Math.max(0, matchIndex - 30);
  const end = Math.min(cleanText.length, matchIndex + matchLen + 70);

  let snippet = cleanText.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < cleanText.length) snippet = snippet + '...';
  return snippet;
}

/**
 * Performs case-insensitive, punctuation-tolerant substring and multi-token matching.
 */
function matchesQuery(searchableText: string, query: string): boolean {
  if (!searchableText || !query) return false;
  
  // Normalize strings (remove common punctuation for tolerant matching)
  const normText = searchableText.toLowerCase();
  const normQuery = query.toLowerCase().trim();
  
  // Direct substring match
  if (normText.includes(normQuery)) return true;

  // Multi-token match: treat punctuation as word separators
  const tokens = normQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
  
  if (tokens.length === 0) return false;

  return tokens.every((token) => normText.includes(token));
}

/**
 * Global Search execution function across all authorized modules.
 * Strictly enforces privacy: no private messages, no phone numbers, no unit numbers.
 */
export function performGlobalSearch(
  query: string,
  data: {
    posts: CommunityPost[];
    comments: { [postId: string]: PostReply[] };
    incidents: ResilienceIncident[];
    exchangeItems: CircularExchangeItem[];
    services: LocalService[];
    currentUser: UserProfile;
  }
): SearchResultItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const results: SearchResultItem[] = [];

  // 1. COMMUNITY FEED POSTS
  for (const post of data.posts) {
    // Exclude deleted or inactive posts
    if (post.deletedAt || (post.status as string) === 'deleted') continue;

    const publicAuthor = post.isAnonymous ? 'Anonymous Neighbour' : post.authorName;
    const categoryLabel = 
      post.category === 'announcement' ? 'Township Announcement' :
      post.category === 'security_alert' ? 'Security Alert' :
      post.category === 'event' ? 'Activities & Events' :
      post.category === 'complaint' ? 'Resident Report / Complaint' : 'Discussion';

    const searchableFields = [
      post.title,
      post.content,
      categoryLabel,
      post.category,
      publicAuthor,
      post.authorPrecinct,
      post.badgeText || ''
    ].join(' ');

    if (matchesQuery(searchableFields, trimmed)) {
      results.push({
        id: post.id,
        module: 'feed',
        moduleLabel: 'Community Post',
        badgeColor: post.category === 'security_alert' || post.category === 'announcement'
          ? 'bg-rose-100 text-[#9E1315] border-rose-200'
          : 'bg-slate-100 text-slate-700 border-slate-200',
        title: post.title || `${categoryLabel} by ${publicAuthor}`,
        snippet: createSnippet(post.content || post.title, trimmed),
        authorOrLocation: publicAuthor,
        precinct: post.authorPrecinct,
        categoryOrType: categoryLabel,
        timestamp: post.createdAt,
      });
    }
  }

  // 2. COMMUNITY COMMENTS & REPLIES
  // Flatten replies across all active posts
  const postLookup = new Map<string, CommunityPost>();
  for (const p of data.posts) {
    postLookup.set(p.id, p);
  }

  for (const [postId, replies] of Object.entries(data.comments)) {
    const parentPost = postLookup.get(postId);
    // If parent post is deleted, do not surface its replies
    if (parentPost && (parentPost.deletedAt || (parentPost.status as string) === 'deleted')) continue;

    for (const reply of replies) {
      if (reply.status === 'deleted' || reply.deletedAt) continue;

      const publicAuthor = reply.authorName || 'Resident';
      const searchableFields = [
        reply.content,
        publicAuthor,
        reply.authorPrecinct || '',
        parentPost?.title || ''
      ].join(' ');

      if (matchesQuery(searchableFields, trimmed)) {
        results.push({
          id: reply.id,
          module: 'comments',
          moduleLabel: 'Post Reply',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          title: `Reply on: "${parentPost?.title || 'Community Post'}"`,
          snippet: createSnippet(reply.content, trimmed),
          authorOrLocation: publicAuthor,
          precinct: reply.authorPrecinct,
          categoryOrType: reply.isOfficialResponse ? 'Official Response' : 'Resident Reply',
          timestamp: reply.createdAt,
          parentPostId: postId,
          parentPostTitle: parentPost?.title || 'Community Post',
        });
      }
    }
  }

  // 3. ACTIVE RESILIENCE INCIDENTS
  // Exclude archived and resolved incidents
  for (const incident of data.incidents) {
    if (incident.isArchived || incident.archivedAt || incident.status === 'resolved') {
      continue;
    }

    const publicReporter = incident.isAnonymous ? 'Anonymous Neighbour' : incident.reporterName;
    const typeLabel = 
      incident.incidentType === 'flood' ? 'Flash Flood' :
      incident.incidentType === 'blocked_drain' ? 'Blocked Drain' :
      incident.incidentType === 'fallen_tree' ? 'Fallen Tree' :
      incident.incidentType === 'pothole' ? 'Damaged Road / Pothole' :
      incident.incidentType === 'street_light' ? 'Streetlight Outage' :
      incident.incidentType === 'water_disruption' ? 'Water Disruption' : 'Resilience Incident';

    const searchableFields = [
      incident.title,
      incident.description,
      incident.locationName,
      incident.reporterPrecinct,
      typeLabel,
      incident.incidentType,
      incident.severity,
      incident.status,
      incident.assignedTeam || '',
      publicReporter
    ].join(' ');

    if (matchesQuery(searchableFields, trimmed)) {
      results.push({
        id: incident.id,
        module: 'incidents',
        moduleLabel: 'Active Incident',
        badgeColor: incident.severity === 'critical' || incident.severity === 'high'
          ? 'bg-rose-100 text-[#9E1315] border-rose-200'
          : 'bg-amber-100 text-amber-800 border-amber-200',
        title: incident.title,
        snippet: createSnippet(incident.description || incident.title, trimmed),
        authorOrLocation: incident.locationName || incident.reporterPrecinct,
        precinct: incident.reporterPrecinct,
        categoryOrType: typeLabel,
        timestamp: incident.createdAt,
      });
    }
  }

  // 4. CIRCULAR EXCHANGE LISTINGS
  for (const item of data.exchangeItems) {
    if (item.status === 'completed') continue;

    const categoryLabel = 
      item.category === 'furniture' ? 'Furniture' :
      item.category === 'appliances' ? 'Home Appliances' :
      item.category === 'baby_kids' ? 'Baby & Kids' :
      item.category === 'books_study' ? 'Books & Study' :
      item.category === 'plants_garden' ? 'Plants & Garden' :
      item.category === 'sports_leisure' ? 'Sports & Leisure' : 'Other';

    const conditionLabel = 
      item.condition === 'brand_new' ? 'Brand New' :
      item.condition === 'like_new' ? 'Like New' :
      item.condition === 'good' ? 'Good Condition' : 'Fair Condition';

    const searchableFields = [
      item.title,
      item.description,
      categoryLabel,
      item.category,
      conditionLabel,
      item.listingType,
      item.seekingItem || '',
      item.precinct,
      item.authorName
    ].join(' ');

    if (matchesQuery(searchableFields, trimmed)) {
      results.push({
        id: item.id,
        module: 'exchange',
        moduleLabel: item.listingType === 'giveaway' ? 'Free Giveaway' : 'Item Exchange',
        badgeColor: item.listingType === 'giveaway'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-purple-50 text-purple-700 border-purple-200',
        title: item.title,
        snippet: createSnippet(item.description || item.title, trimmed),
        authorOrLocation: item.authorName,
        precinct: item.precinct,
        categoryOrType: `${categoryLabel} • ${conditionLabel}`,
        timestamp: item.createdAt,
      });
    }
  }

  // 5. LOCAL SERVICES & HELP REQUESTS
  for (const service of data.services) {
    if (service.status === 'closed' || service.status === 'flagged') continue;

    const isRequest = service.type === 'requesting';
    const categoryLabel = 
      service.category === 'home_services' ? 'Home Services & Repairs' :
      service.category === 'childcare' ? 'Childcare & Babysitting' :
      service.category === 'pet_care' ? 'Pet Care & Boarding' :
      service.category === 'tutoring' ? 'Tuition & Music' :
      service.category === 'carpool' ? 'Carpool & Rideshare' :
      service.category === 'gardening' ? 'Gardening & Landscaping' :
      service.category === 'cleaning' ? 'Home Cleaning' :
      service.category === 'moving' ? 'Moving & Heavy Lifting' :
      service.category === 'tech_help' ? 'Tech & Gadgets' : 'Other Services';

    const searchableFields = [
      service.title,
      service.description,
      categoryLabel,
      service.category,
      service.priceEstimate || '',
      service.compensationPreference || '',
      service.precinct,
      service.authorName,
      isRequest ? 'Request for Help Need Help' : 'Service Offering Provided Available'
    ].join(' ');

    if (matchesQuery(searchableFields, trimmed)) {
      results.push({
        id: service.id,
        module: isRequest ? 'requests' : 'services',
        moduleLabel: isRequest ? 'Help Request' : 'Service Offering',
        badgeColor: isRequest
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-teal-50 text-teal-700 border-teal-200',
        title: service.title,
        snippet: createSnippet(service.description || service.title, trimmed),
        authorOrLocation: service.authorName,
        precinct: service.precinct,
        categoryOrType: categoryLabel + (service.priceEstimate ? ` • ${service.priceEstimate}` : ''),
        timestamp: service.createdAt,
        isHelpRequest: isRequest,
      });
    }
  }

  return results;
}
