import { NextRequest, NextResponse } from 'next/server';
import { 
  getSupabaseAdmin, 
  toDatabaseUserId, 
  mapToSupabaseReportType,
  bootstrapDatabaseIfEmpty,
  getMemoryStore,
  updateMemoryStore
} from '@/lib/server/dbSync';
import { INITIAL_RESILIENCE_INCIDENTS, INITIAL_POSTS, INITIAL_EXCHANGE_ITEMS, INITIAL_SERVICES } from '@/lib/data/mockData';

/**
 * GET /api/sync
 * Fetches the latest synchronized records from Supabase (with fallback to verified township store).
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const memory = getMemoryStore();

  let dbIncidents: any[] = [];
  let dbPosts: any[] = [];
  let dbComments: Record<string, any[]> = {};
  let dbExchange: any[] = [];
  let dbServices: any[] = [];
  let fromDatabase = false;

  if (supabase) {
    try {
      await bootstrapDatabaseIfEmpty(supabase);

      // 1. Fetch community_reports
      const { data: reports, error: reportsErr } = await supabase
        .from('community_reports')
        .select('*, reporter:public_profiles(full_name, township_precinct, role)')
        .order('created_at', { ascending: false });

      if (!reportsErr && reports && reports.length > 0) {
        dbIncidents = reports.map((r: any) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterName: r.is_anonymous ? 'Anonymous Neighbour' : (r.reporter?.full_name || 'Resident'),
          reporterPrecinct: r.reporter?.township_precinct || 'Bandar Elmina',
          incidentType: r.report_type || 'flood',
          title: r.title,
          description: r.description,
          locationName: r.location_name,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          severity: r.severity || 'medium',
          status: r.status === 'pending' ? 'reported' : r.status,
          isVerified: r.status === 'under_review' || r.status === 'resolved',
          isAnonymous: Boolean(r.is_anonymous),
          assignedTeam: r.assigned_team,
          managementNotes: r.management_notes,
          updates: [
            {
              id: `upd-${r.id}`,
              incidentId: r.id,
              authorName: r.is_anonymous ? 'Anonymous Neighbour' : (r.reporter?.full_name || 'Resident'),
              authorRole: 'resident',
              note: r.description,
              createdAt: r.created_at,
            },
          ],
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
        }));
        fromDatabase = true;
      }

      // 2. Fetch community_posts
      const { data: posts, error: postsErr } = await supabase
        .from('community_posts')
        .select('*, author:public_profiles(full_name, township_precinct, role, avatar_url, verification_status)')
        .order('created_at', { ascending: false });

      if (!postsErr && posts && posts.length > 0) {
        dbPosts = posts.map((p: any) => ({
          id: p.id,
          authorId: p.author_id,
          authorName: p.is_anonymous ? 'Anonymous Neighbour' : (p.author?.full_name || 'Resident'),
          authorPrecinct: p.author?.township_precinct || 'Bandar Elmina',
          authorRole: p.author?.role || 'resident',
          authorAvatar: p.is_anonymous ? undefined : p.author?.avatar_url,
          authorVerified: p.author?.verification_status === 'verified',
          category: p.category,
          title: p.title,
          content: p.content,
          imageUrl: p.image_url,
          isPinned: Boolean(p.is_pinned),
          isAnonymous: Boolean(p.is_anonymous),
          upvotesCount: p.upvotes_count || 0,
          repliesCount: 0,
          status: p.status || 'active',
          createdAt: p.created_at,
          updatedAt: p.updated_at || p.created_at,
        }));
        fromDatabase = true;
      }

      // 3. Fetch comments
      const { data: comments, error: commErr } = await supabase
        .from('comments')
        .select('*, author:public_profiles(full_name, township_precinct, role, avatar_url, verification_status)')
        .order('created_at', { ascending: true });

      if (!commErr && comments) {
        comments.forEach((c: any) => {
          if (!dbComments[c.post_id]) dbComments[c.post_id] = [];
          dbComments[c.post_id].push({
            id: c.id,
            postId: c.post_id,
            authorId: c.author_id,
            authorName: c.author?.full_name || 'Resident',
            authorPrecinct: c.author?.township_precinct || 'Bandar Elmina',
            authorRole: c.author?.role || 'resident',
            authorAvatar: c.author?.avatar_url,
            authorVerified: c.author?.verification_status === 'verified',
            content: c.content,
            isOfficialResponse: Boolean(c.is_official_response),
            createdAt: c.created_at,
            updatedAt: c.created_at,
          });
        });
      }

      // 4. Fetch exchange_listings
      const { data: exchange, error: exchErr } = await supabase
        .from('exchange_listings')
        .select('*, author:public_profiles(full_name, township_precinct, verification_status)')
        .order('created_at', { ascending: false });

      if (!exchErr && exchange && exchange.length > 0) {
        dbExchange = exchange.map((e: any) => ({
          id: e.id,
          authorId: e.author_id,
          authorName: e.author?.full_name || 'Resident',
          authorPrecinct: e.author?.township_precinct || e.precinct,
          authorVerified: e.author?.verification_status === 'verified',
          listingType: e.listing_type || 'giveaway',
          category: e.category || 'others',
          title: e.title,
          description: e.description,
          condition: e.condition || 'good',
          imageUrl: e.image_url,
          imageUrls: e.image_url ? [e.image_url] : [],
          precinct: e.precinct,
          status: e.status || 'available',
          reservedById: e.reserved_by_id,
          createdAt: e.created_at,
        }));
        fromDatabase = true;
      }

      // 5. Fetch service_listings
      const { data: services, error: servErr } = await supabase
        .from('service_listings')
        .select('*, author:public_profiles(full_name, township_precinct, verification_status)')
        .order('created_at', { ascending: false });

      if (!servErr && services && services.length > 0) {
        dbServices = services.map((s: any) => ({
          id: s.id,
          authorId: s.author_id,
          authorName: s.author?.full_name || 'Resident',
          authorPrecinct: s.author?.township_precinct || s.precinct,
          authorVerified: s.author?.verification_status === 'verified',
          type: s.type || 'offering',
          category: s.category || 'home_services',
          title: s.title,
          description: s.description,
          priceEstimate: s.price_estimate,
          precinct: s.precinct,
          status: s.status || 'active',
          createdAt: s.created_at,
        }));
        fromDatabase = true;
      }
    } catch (e) {
      console.warn('[Sync API] Database query warning:', e);
    }
  }

  // Merge database records with memory store (database records take precedence)
  const finalIncidents = dbIncidents.length > 0 
    ? [...dbIncidents, ...memory.incidents.filter((m) => !dbIncidents.some((d) => d.id === m.id))]
    : memory.incidents;

  const finalPosts = dbPosts.length > 0
    ? [...dbPosts, ...memory.posts.filter((m) => !dbPosts.some((d) => d.id === m.id))]
    : memory.posts;

  const finalExchange = dbExchange.length > 0
    ? [...dbExchange, ...memory.exchange.filter((m) => !dbExchange.some((d) => d.id === m.id))]
    : memory.exchange;

  const finalServices = dbServices.length > 0
    ? [...dbServices, ...memory.services.filter((m) => !dbServices.some((d) => d.id === m.id))]
    : memory.services;

  const finalComments = { ...memory.comments, ...dbComments };

  return NextResponse.json({
    success: true,
    fromDatabase,
    data: {
      incidents: finalIncidents,
      posts: finalPosts,
      comments: finalComments,
      exchange: finalExchange,
      services: finalServices,
      conversations: memory.conversations,
      messages: memory.messages,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/sync
 * Executes authorized mutations, persists to Supabase, updates shared memory,
 * and triggers Supabase Realtime broadcast.
 */
export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, payload, user } = body;
  if (!action || !payload) {
    return NextResponse.json({ success: false, error: 'Missing action or payload' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const memory = getMemoryStore();

  let resultRecord: any = null;

  try {
    switch (action) {
      case 'REPORT_INCIDENT': {
        const reporterUuid = toDatabaseUserId(user?.id || payload.reporterId);
        const reportType = mapToSupabaseReportType(payload.incidentType || payload.type);

        const newIncidentRecord = {
          reporter_id: reporterUuid,
          report_type: reportType,
          title: payload.title,
          description: payload.description,
          location_name: payload.locationName || 'Bandar Elmina',
          latitude: payload.latitude,
          longitude: payload.longitude,
          severity: payload.severity || 'medium',
          status: 'pending',
          is_anonymous: Boolean(payload.isAnonymous),
          management_notes: null,
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('community_reports')
            .insert(newIncidentRecord)
            .select()
            .single();

          if (error) {
            console.error('[Sync API] Error inserting community_report:', error);
            // Fall back to memory with generated ID if Supabase errors
            resultRecord = {
              ...payload,
              id: `inc-${Date.now()}`,
              status: 'reported',
              createdAt: new Date().toISOString(),
            };
          } else {
            resultRecord = {
              id: data.id,
              reporterId: user?.id || payload.reporterId,
              reporterName: payload.isAnonymous ? 'Anonymous Neighbour' : (user?.fullName || 'Resident'),
              reporterPrecinct: user?.townshipPrecinct || 'Bandar Elmina',
              incidentType: payload.incidentType,
              title: data.title,
              description: data.description,
              locationName: data.location_name,
              latitude: Number(data.latitude),
              longitude: Number(data.longitude),
              severity: data.severity,
              status: 'reported',
              isVerified: false,
              isAnonymous: Boolean(data.is_anonymous),
              createdAt: data.created_at,
              updatedAt: data.created_at,
              updates: [
                {
                  id: `upd-${data.id}`,
                  incidentId: data.id,
                  authorName: payload.isAnonymous ? 'Anonymous Neighbour' : (user?.fullName || 'Resident'),
                  authorRole: 'resident',
                  note: data.description,
                  createdAt: data.created_at,
                },
              ],
            };
          }
        } else {
          resultRecord = {
            ...payload,
            id: `inc-${Date.now()}`,
            status: 'reported',
            createdAt: new Date().toISOString(),
          };
        }

        // Update shared memory
        updateMemoryStore({ incidents: [resultRecord, ...memory.incidents] });
        break;
      }

      case 'VERIFY_INCIDENT': {
        const { incidentId, notes, verifiedBy } = payload;
        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: 'under_review',
              management_notes: notes,
            })
            .eq('id', incidentId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (inc.id === incidentId) {
            return {
              ...inc,
              isVerified: true,
              status: 'in_progress',
              verificationNotes: notes,
              verifiedByName: verifiedBy || 'JMB Management Office',
              managementNotes: notes,
              updatedAt: new Date().toISOString(),
            };
          }
          return inc;
        });
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, verified: true };
        break;
      }

      case 'REJECT_INCIDENT': {
        const { incidentId, reason } = payload;
        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: 'dismissed',
              management_notes: `Rejected: ${reason}`,
            })
            .eq('id', incidentId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (inc.id === incidentId) {
            return {
              ...inc,
              status: 'resolved',
              managementNotes: `Rejected: ${reason}`,
              updatedAt: new Date().toISOString(),
            };
          }
          return inc;
        });
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, rejected: true };
        break;
      }

      case 'CREATE_POST': {
        const authorUuid = toDatabaseUserId(user?.id || payload.authorId);
        // Map category to allowed enum in community_posts table: 'discussion', 'event', 'complaint', 'general'
        let dbCategory = payload.category || 'discussion';
        if (!['discussion', 'event', 'complaint', 'general'].includes(dbCategory)) {
          dbCategory = 'general';
        }

        // Format content with event metadata trailer if event fields provided
        let enrichedContent = payload.content;
        if (payload.category === 'event' || payload.eventDate) {
          const trailers: string[] = [];
          if (payload.eventDate && !enrichedContent.includes('[Date:')) {
            trailers.push(`[Date: ${payload.eventDate.split('T')[0]}]`);
          }
          if (payload.eventTime && !enrichedContent.includes('[Time:')) {
            trailers.push(`[Time: ${payload.eventTime}]`);
          }
          if (payload.eventVenue && !enrichedContent.includes('[Venue:')) {
            trailers.push(`[Venue: ${payload.eventVenue}]`);
          }
          if (trailers.length > 0) {
            enrichedContent = `${enrichedContent}\n\n${trailers.join(' ')}`;
          }
        }

        const newPostRecord = {
          author_id: authorUuid,
          category: dbCategory,
          title: payload.title,
          content: enrichedContent,
          image_url: payload.imageUrl || null,
          is_anonymous: Boolean(payload.isAnonymous),
          upvotes_count: 0,
          status: 'active',
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('community_posts')
            .insert(newPostRecord)
            .select()
            .single();

          if (!error && data) {
            resultRecord = {
              id: data.id,
              authorId: user?.id || payload.authorId,
              authorName: payload.isAnonymous ? 'Anonymous Neighbour' : (user?.fullName || 'Resident'),
              authorPrecinct: user?.townshipPrecinct || 'Bandar Elmina',
              authorRole: user?.role || 'resident',
              authorAvatar: payload.isAnonymous ? undefined : user?.avatarUrl,
              authorVerified: user?.verificationStatus === 'verified',
              category: payload.category || data.category,
              title: data.title,
              content: data.content,
              imageUrl: data.image_url,
              isPinned: payload.category === 'announcement' || payload.category === 'security_alert',
              isAnonymous: Boolean(data.is_anonymous),
              upvotesCount: 0,
              repliesCount: 0,
              status: 'active',
              createdAt: data.created_at,
              updatedAt: data.created_at,
              eventDate: payload.eventDate,
              eventEndDate: payload.eventEndDate,
              eventTime: payload.eventTime,
              eventVenue: payload.eventVenue,
            };
          } else {
            console.error('[Sync API] Error inserting community_post:', error);
            resultRecord = { ...payload, id: `post-${Date.now()}`, createdAt: new Date().toISOString() };
          }
        } else {
          resultRecord = { ...payload, id: `post-${Date.now()}`, createdAt: new Date().toISOString() };
        }

        updateMemoryStore({ posts: [resultRecord, ...memory.posts] });
        break;
      }

      case 'ADD_COMMENT': {
        const authorUuid = toDatabaseUserId(user?.id || payload.authorId);
        const newCommentRecord = {
          post_id: payload.postId,
          author_id: authorUuid,
          content: payload.content,
          is_official_response: Boolean(payload.isOfficialResponse || user?.role === 'management'),
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('comments')
            .insert(newCommentRecord)
            .select()
            .single();

          if (!error && data) {
            resultRecord = {
              id: data.id,
              postId: data.post_id,
              authorId: user?.id || payload.authorId,
              authorName: user?.fullName || 'Resident',
              authorPrecinct: user?.townshipPrecinct || 'Bandar Elmina',
              authorRole: user?.role || 'resident',
              authorAvatar: user?.avatarUrl,
              authorVerified: user?.verificationStatus === 'verified',
              content: data.content,
              isOfficialResponse: Boolean(data.is_official_response),
              createdAt: data.created_at,
              updatedAt: data.created_at,
            };
          } else {
            resultRecord = { ...payload, id: `comment-${Date.now()}`, createdAt: new Date().toISOString() };
          }
        } else {
          resultRecord = { ...payload, id: `comment-${Date.now()}`, createdAt: new Date().toISOString() };
        }

        const commentsMap = { ...memory.comments };
        if (!commentsMap[payload.postId]) commentsMap[payload.postId] = [];
        commentsMap[payload.postId].push(resultRecord);
        updateMemoryStore({ comments: commentsMap });
        break;
      }

      case 'CREATE_EXCHANGE': {
        const authorUuid = toDatabaseUserId(user?.id || payload.authorId);
        const newExchangeRecord = {
          author_id: authorUuid,
          listing_type: payload.listingType || 'giveaway',
          category: payload.category || 'others',
          title: payload.title,
          description: payload.description,
          condition: payload.condition || 'good',
          image_url: payload.imageUrl || (payload.imageUrls && payload.imageUrls[0]) || null,
          precinct: payload.precinct || user?.townshipPrecinct || 'Bandar Elmina',
          status: 'available',
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('exchange_listings')
            .insert(newExchangeRecord)
            .select()
            .single();

          if (!error && data) {
            resultRecord = {
              id: data.id,
              authorId: user?.id || payload.authorId,
              authorName: user?.fullName || 'Resident',
              authorPrecinct: user?.townshipPrecinct || data.precinct,
              authorVerified: user?.verificationStatus === 'verified',
              listingType: data.listing_type,
              category: data.category,
              title: data.title,
              description: data.description,
              condition: data.condition,
              imageUrl: data.image_url,
              imageUrls: data.image_url ? [data.image_url] : [],
              precinct: data.precinct,
              status: data.status,
              createdAt: data.created_at,
            };
          } else {
            resultRecord = { ...payload, id: `ex-${Date.now()}`, createdAt: new Date().toISOString() };
          }
        } else {
          resultRecord = { ...payload, id: `ex-${Date.now()}`, createdAt: new Date().toISOString() };
        }

        updateMemoryStore({ exchange: [resultRecord, ...memory.exchange] });
        break;
      }

      case 'RESERVE_EXCHANGE': {
        const { itemId, reservedById } = payload;
        const reserverUuid = toDatabaseUserId(reservedById);
        if (supabase) {
          await supabase
            .from('exchange_listings')
            .update({ status: 'reserved', reserved_by_id: reserverUuid })
            .eq('id', itemId);
        }

        const updated = memory.exchange.map((ex) => (ex.id === itemId ? { ...ex, status: 'reserved', reservedById } : ex));
        updateMemoryStore({ exchange: updated });
        resultRecord = { itemId, status: 'reserved' };
        break;
      }

      case 'CREATE_SERVICE': {
        const authorUuid = toDatabaseUserId(user?.id || payload.authorId);
        const newServiceRecord = {
          author_id: authorUuid,
          type: payload.type || 'offering',
          category: payload.category || 'home_services',
          title: payload.title,
          description: payload.description,
          price_estimate: payload.priceEstimate || null,
          precinct: payload.precinct || user?.townshipPrecinct || 'Bandar Elmina',
          status: 'active',
        };

        if (supabase) {
          const { data, error } = await supabase
            .from('service_listings')
            .insert(newServiceRecord)
            .select()
            .single();

          if (!error && data) {
            resultRecord = {
              id: data.id,
              authorId: user?.id || payload.authorId,
              authorName: user?.fullName || 'Resident',
              authorPrecinct: user?.townshipPrecinct || data.precinct,
              authorVerified: user?.verificationStatus === 'verified',
              type: data.type,
              category: data.category,
              title: data.title,
              description: data.description,
              priceEstimate: data.price_estimate,
              precinct: data.precinct,
              status: data.status,
              createdAt: data.created_at,
            };
          } else {
            resultRecord = { ...payload, id: `serv-${Date.now()}`, createdAt: new Date().toISOString() };
          }
        } else {
          resultRecord = { ...payload, id: `serv-${Date.now()}`, createdAt: new Date().toISOString() };
        }

        updateMemoryStore({ services: [resultRecord, ...memory.services] });
        break;
      }

      case 'DELETE_SERVICE': {
        const { serviceId } = payload;
        if (supabase) {
          await supabase.from('service_listings').delete().eq('id', serviceId);
        }
        const updatedServices = memory.services.filter((s) => s.id !== serviceId);
        updateMemoryStore({ services: updatedServices });
        resultRecord = { serviceId, deleted: true };
        break;
      }

      case 'DELETE_POST': {
        const { postId } = payload;
        if (supabase) {
          await supabase.from('comments').delete().eq('post_id', postId);
          await supabase.from('community_posts').delete().eq('id', postId);
        }
        const updatedPosts = memory.posts.filter((p) => p.id !== postId);
        const updatedComments = { ...memory.comments };
        delete updatedComments[postId];
        updateMemoryStore({ posts: updatedPosts, comments: updatedComments });
        resultRecord = { postId, deleted: true };
        break;
      }

      case 'RESOLVE_INCIDENT': {
        const { incidentId, notes } = payload;
        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: 'resolved',
              management_notes: notes,
            })
            .eq('id', incidentId);
        }
        const updatedIncidents = memory.incidents.map((inc) =>
          inc.id === incidentId
            ? { ...inc, status: 'resolved' as const, managementNotes: notes, updatedAt: new Date().toISOString() }
            : inc
        );
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, resolved: true };
        break;
      }

      case 'UPVOTE_POST': {
        const { postId } = payload;
        if (supabase) {
          const { data: post } = await supabase.from('community_posts').select('upvotes_count').eq('id', postId).single();
          if (post) {
            await supabase.from('community_posts').update({ upvotes_count: (post.upvotes_count || 0) + 1 }).eq('id', postId);
          }
        }
        const updatedPosts = memory.posts.map((p) =>
          p.id === postId ? { ...p, upvotesCount: (p.upvotesCount || 0) + 1 } : p
        );
        updateMemoryStore({ posts: updatedPosts });
        resultRecord = { postId, upvoted: true };
        break;
      }

      case 'UPDATE_INCIDENT_STATUS': {
        const { incidentId, status, note, assignedTeam } = payload;
        const timestamp = new Date().toISOString();
        const dbStatus = status === 'resolved' ? 'resolved' : (status === 'dispatched' ? 'dispatched' : 'under_review');

        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: dbStatus,
              management_notes: note,
              assigned_team: assignedTeam || null,
              resolved_at: status === 'resolved' ? timestamp : null,
              updated_at: timestamp,
            })
            .eq('id', incidentId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (inc.id === incidentId) {
            const updateRecord = {
              id: `upd-${Date.now()}`,
              incidentId,
              authorName: user?.fullName || 'JMB Management Office',
              authorRole: user?.role || 'management',
              statusFrom: inc.status,
              statusTo: status,
              note: note || `Status updated to ${status}`,
              createdAt: timestamp,
            };
            return {
              ...inc,
              status,
              assignedTeam: assignedTeam || inc.assignedTeam,
              managementNotes: note || inc.managementNotes,
              resolvedAt: status === 'resolved' ? timestamp : inc.resolvedAt,
              updates: [updateRecord, ...(inc.updates || [])],
              updatedAt: timestamp,
            };
          }
          return inc;
        });

        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, status, assignedTeam, note };
        break;
      }

      case 'SEND_MESSAGE': {
        const { conversationId, content, isAnonymous, imageUrl } = payload;
        const senderName = isAnonymous 
          ? 'Elmina Neighbour (Anonymous)' 
          : (user?.displayName || user?.fullName || 'Resident');

        const newMsg = {
          id: `msg-${Date.now()}`,
          conversationId,
          senderId: user?.id || 'user-nurul',
          senderName,
          senderAvatar: isAnonymous ? undefined : user?.avatarUrl,
          isAnonymous: Boolean(isAnonymous),
          content,
          imageUrl,
          createdAt: new Date().toISOString(),
        };

        const updatedMessages = [...memory.messages, newMsg];
        const updatedConversations = memory.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: content || (imageUrl ? '📷 Photo attached' : ''),
                lastMessageTime: new Date().toISOString(),
              }
            : c
        );

        updateMemoryStore({ messages: updatedMessages, conversations: updatedConversations });
        resultRecord = newMsg;
        break;
      }

      case 'START_CONVERSATION': {
        const { conversation } = payload;
        const exists = memory.conversations.some((c) => c.id === conversation.id);
        const updatedConversations = exists 
          ? memory.conversations 
          : [conversation, ...memory.conversations];

        updateMemoryStore({ conversations: updatedConversations });
        resultRecord = conversation;
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Try Supabase Realtime Broadcast if supabase client is active
    if (supabase) {
      try {
        const channel = supabase.channel('tesdh-live-sync');
        await channel.send({
          type: 'broadcast',
          event: 'tesdh-sync',
          payload: { action, record: resultRecord, timestamp: Date.now() },
        });
      } catch (broadcastErr) {
        // Broadcast send is best-effort alongside DB write
      }
    }

    return NextResponse.json({
      success: true,
      action,
      data: resultRecord,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Sync API] Mutation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server mutation failed' },
      { status: 500 }
    );
  }
}
