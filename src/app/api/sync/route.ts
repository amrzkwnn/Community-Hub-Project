import { NextRequest, NextResponse } from 'next/server';
import { 
  getSupabaseAdmin, 
  toDatabaseUserId, 
  fromDatabaseUserId,
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
  let dbConversations: any[] = [];
  let dbMessages: any[] = [];
  let dbMessageRequests: any[] = [];
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
          status: r.status || 'pending',
          isVerified: r.status === 'under_review' || r.status === 'resolved' || r.status === 'dispatched',
          isAnonymous: Boolean(r.is_anonymous),
          assignedTeam: r.assigned_team,
          managementNotes: r.management_notes,
          parentIncidentId: r.parent_incident_id || null,
          isMerged: Boolean(r.is_merged || (r.management_notes && r.management_notes.includes('[Merged into'))),
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
          authorId: fromDatabaseUserId(e.author_id),
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
          authorId: fromDatabaseUserId(s.author_id),
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

      // 6. Look up participant display names from public_profiles
      const { data: profs } = await supabase.from('public_profiles').select('id, full_name, display_name');
      const profMap: Record<string, string> = {};
      if (profs) {
        profs.forEach((p: any) => {
          profMap[p.id] = p.display_name || p.full_name || 'Resident';
        });
      }

      // 7. Fetch messages (ordered by created_at)
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      const msgMap: Record<string, any[]> = {};
      if (!msgErr && msgs && msgs.length > 0) {
        dbMessages = msgs.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: fromDatabaseUserId(m.sender_id),
          senderName: profMap[m.sender_id] || 'Resident',
          isAnonymous: false,
          content: m.content || '',
          createdAt: m.created_at,
        }));
        msgs.forEach((m: any) => {
          if (!msgMap[m.conversation_id]) msgMap[m.conversation_id] = [];
          msgMap[m.conversation_id].push(m);
        });
        fromDatabase = true;
      }

      // 8. Fetch conversations (ordered by updated_at)
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!convErr && convs && convs.length > 0) {
        dbConversations = convs.map((c: any) => {
          const cMsgs = msgMap[c.id] || [];
          const lastMsg = cMsgs[cMsgs.length - 1];
          return {
            id: c.id,
            participantOneId: fromDatabaseUserId(c.participant_one),
            participantOneName: profMap[c.participant_one] || 'Resident',
            participantTwoId: fromDatabaseUserId(c.participant_two),
            participantTwoName: profMap[c.participant_two] || 'Resident',
            subject: c.subject || 'Direct Message',
            contextType: c.context_type || 'general',
            status: 'accepted',
            lastMessage: lastMsg?.content || '',
            lastMessageTime: lastMsg?.created_at || c.updated_at || c.created_at,
            unreadCount: 0,
          };
        });
        fromDatabase = true;
      }

      // 9. Fetch property_message_requests (if table exists)
      try {
        const { data: msgRequests, error: msgReqErr } = await supabase
          .from('property_message_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!msgReqErr && msgRequests && msgRequests.length > 0) {
          dbMessageRequests = msgRequests.map((r: any) => ({
            id: r.id,
            senderId: fromDatabaseUserId(r.sender_id),
            recipientId: fromDatabaseUserId(r.recipient_id),
            propertyAddress: r.property_address,
            subject: r.subject,
            initialMessage: r.initial_message,
            isAnonymous: Boolean(r.is_anonymous),
            senderDisplayName: r.sender_display_name,
            status: r.status,
            conversationId: r.conversation_id,
            createdAt: r.created_at,
          }));
          fromDatabase = true;
        }
      } catch {}
    } catch (e) {
      console.warn('[Sync API] Database query warning:', e);
    }
  }

  // 1. Authenticate requesting user to enforce server-side access control
  const sessionHeader = request.headers.get('x-tesdh-session') || 
    request.headers.get('authorization')?.replace('Bearer ', '');
  let isManagement = false;
  let requestingUserId = sessionHeader || '';

  if (sessionHeader === 'user-azman' || sessionHeader === '33333333-3333-4333-8333-333333333333') {
    isManagement = true;
  } else if (sessionHeader) {
    const { INITIAL_PROFILES } = await import('@/lib/data/mockData');
    const p = INITIAL_PROFILES.find((prof) => prof.id === sessionHeader || prof.id === fromDatabaseUserId(sessionHeader));
    if (p?.role === 'management') {
      isManagement = true;
    }
  }

  // Merge database records with memory store (database records take precedence)
  const rawIncidents = dbIncidents.length > 0 
    ? [...dbIncidents, ...memory.incidents.filter((m) => !dbIncidents.some((d) => d.id === m.id))]
    : memory.incidents;

  // Enforce server-side approval-only public visibility (Part 5):
  // - Approved incidents ('reported', 'under_review', 'dispatched', 'resolved') are visible to all.
  // - Unapproved ('pending') and 'rejected' incidents are ONLY returned if requesting user is Management or original submitter.
  // - Merged duplicate incidents are excluded from public maps to prevent duplicate markers.
  const finalIncidents = rawIncidents.filter((inc) => {
    // Management sees all incidents (including pending, rejected, and merged duplicates for audit)
    if (isManagement) return true;

    // Original reporter can see their own pending or rejected submissions
    if (requestingUserId) {
      const reporterUuid = toDatabaseUserId(requestingUserId);
      if (inc.reporterId === requestingUserId || inc.reporterId === reporterUuid) {
        return true;
      }
    }

    // Hide unapproved (pending) and rejected reports from public and other residents
    if (inc.status === 'pending' || inc.status === 'rejected' || inc.status === 'dismissed') {
      return false;
    }

    // Hide merged duplicates from public map view
    if (inc.isMerged) {
      return false;
    }

    return true;
  });

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

  const finalConversations = dbConversations.length > 0
    ? [...dbConversations, ...memory.conversations.filter((m) => !dbConversations.some((d) => d.id === m.id))]
    : memory.conversations;

  const finalMessages = dbMessages.length > 0
    ? [...dbMessages, ...memory.messages.filter((m) => !dbMessages.some((d) => d.id === m.id))]
    : memory.messages;

  const finalMessageRequests = dbMessageRequests.length > 0
    ? [...dbMessageRequests, ...memory.messageRequests.filter((m) => !dbMessageRequests.some((d) => d.id === m.id))]
    : memory.messageRequests;

  return NextResponse.json({
    success: true,
    fromDatabase,
    data: {
      incidents: finalIncidents,
      posts: finalPosts,
      comments: finalComments,
      exchange: finalExchange,
      services: finalServices,
      conversations: finalConversations,
      messages: finalMessages,
      messageRequests: finalMessageRequests,
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
              status: 'pending',
              isVerified: false,
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
              status: 'pending',
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
            status: 'pending',
            isVerified: false,
            createdAt: new Date().toISOString(),
          };
        }

        // Update shared memory
        updateMemoryStore({ incidents: [resultRecord, ...memory.incidents] });
        break;
      }

      case 'APPROVE_INCIDENT':
      case 'VERIFY_INCIDENT': {
        const { incidentId, notes, verifiedBy } = payload;
        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: 'under_review',
              management_notes: notes || 'Verified and approved for public community visibility.',
            })
            .eq('id', incidentId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (inc.id === incidentId) {
            return {
              ...inc,
              status: 'under_review' as any,
              isVerified: true,
              verificationNotes: notes || 'Verified and approved by Management.',
              verifiedByName: verifiedBy || user?.fullName || 'Capt. (R) Azman (Management)',
              verifiedAt: new Date().toISOString(),
              managementNotes: notes || 'Verified and approved by Management.',
              updatedAt: new Date().toISOString(),
            };
          }
          return inc;
        });
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, verified: true, approved: true };
        break;
      }

      case 'REJECT_INCIDENT': {
        const { incidentId, reason } = payload;
        if (supabase) {
          await supabase
            .from('community_reports')
            .update({
              status: 'rejected',
              management_notes: `Rejected: ${reason || 'Unconfirmed report'}`,
            })
            .eq('id', incidentId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (inc.id === incidentId) {
            return {
              ...inc,
              status: 'rejected' as any,
              isVerified: false,
              managementNotes: `Rejected: ${reason || 'Unconfirmed report'}`,
              updatedAt: new Date().toISOString(),
            };
          }
          return inc;
        });
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { incidentId, rejected: true };
        break;
      }

      case 'MERGE_INCIDENTS': {
        const { canonicalId, duplicateIds, reason } = payload;
        const mergeNote = reason || 'Merged into canonical incident report';
        const now = new Date().toISOString();

        if (supabase) {
          for (const dupId of duplicateIds) {
            await supabase
              .from('community_reports')
              .update({
                status: 'resolved',
                management_notes: `[Merged into #${canonicalId}] ${mergeNote}`,
              })
              .eq('id', dupId);
          }
          await supabase
            .from('community_reports')
            .update({
              management_notes: `[Consolidated ${duplicateIds.length} duplicate report(s)] ${mergeNote}`,
            })
            .eq('id', canonicalId);
        }

        const updatedIncidents = memory.incidents.map((inc) => {
          if (duplicateIds.includes(inc.id)) {
            return {
              ...inc,
              status: 'resolved' as any,
              parentIncidentId: canonicalId,
              isMerged: true,
              duplicateReason: mergeNote,
              mergedAt: now,
              mergedBy: user?.fullName || 'Management',
              updatedAt: now,
            };
          }
          if (inc.id === canonicalId) {
            return {
              ...inc,
              mergedIncidentIds: Array.from(new Set([...(inc.mergedIncidentIds || []), ...duplicateIds])),
              managementNotes: `[Consolidated ${duplicateIds.length} duplicate report(s)] ${mergeNote}`,
              updatedAt: now,
            };
          }
          return inc;
        });
        updateMemoryStore({ incidents: updatedIncidents });
        resultRecord = { canonicalId, duplicateIds, merged: true };
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

        let savedMsg = {
          id: `msg-${Date.now()}`,
          conversationId,
          senderId: user?.id || 'user-nurul',
          senderName,
          senderAvatar: isAnonymous ? undefined : user?.avatarUrl,
          isAnonymous: Boolean(isAnonymous),
          content: content || '',
          imageUrl,
          createdAt: new Date().toISOString(),
        };

        if (supabase) {
          try {
            const senderUuid = toDatabaseUserId(user?.id);
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);
            
            if (isUuid) {
              const { data: dbMsg, error: dbMsgErr } = await supabase
                .from('messages')
                .insert({
                  conversation_id: conversationId,
                  sender_id: senderUuid,
                  content: content || (imageUrl ? '📷 Photo attached' : ''),
                  is_read: false,
                })
                .select()
                .single();

              if (!dbMsgErr && dbMsg) {
                savedMsg.id = dbMsg.id;
                savedMsg.createdAt = dbMsg.created_at;
              }

              await supabase
                .from('conversations')
                .update({
                  updated_at: new Date().toISOString(),
                })
                .eq('id', conversationId);
            }
          } catch (msgErr) {
            console.warn('[Sync API] Error writing message to Supabase:', msgErr);
          }
        }

        const updatedMessages = [...memory.messages.filter((m) => m.id !== savedMsg.id), savedMsg];
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
        resultRecord = savedMsg;
        break;
      }

      case 'START_CONVERSATION': {
        const { conversation, initialMessage } = payload;
        const pOneUuid = toDatabaseUserId(user?.id || conversation.participantOneId);
        const pTwoUuid = toDatabaseUserId(conversation.participantTwoId);
        
        let savedConv = conversation;
        if (supabase && pOneUuid !== pTwoUuid) {
          try {
            // Check if conversation already exists in DB
            const { data: existing } = await supabase
              .from('conversations')
              .select('*')
              .or(`and(participant_one.eq.${pOneUuid},participant_two.eq.${pTwoUuid}),and(participant_one.eq.${pTwoUuid},participant_two.eq.${pOneUuid})`)
              .maybeSingle();

            if (existing) {
              savedConv = {
                ...conversation,
                id: existing.id,
                status: 'accepted',
                lastMessage: conversation.lastMessage || initialMessage || '',
                lastMessageTime: existing.updated_at || new Date().toISOString(),
              };
            } else {
              const { data: inserted, error: insertErr } = await supabase
                .from('conversations')
                .insert({
                  participant_one: pOneUuid,
                  participant_two: pTwoUuid,
                  subject: conversation.subject || 'Direct Message',
                  context_type: 'general',
                  updated_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!insertErr && inserted) {
                savedConv = {
                  ...conversation,
                  id: inserted.id,
                  status: 'accepted',
                };
              }
            }

            // If initial message provided, also persist message atomically
            if (initialMessage && initialMessage.trim()) {
              const senderUuid = toDatabaseUserId(user?.id);
              const isConvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(savedConv.id);
              if (isConvUuid) {
                await supabase.from('messages').insert({
                  conversation_id: savedConv.id,
                  sender_id: senderUuid,
                  content: initialMessage.trim(),
                  is_read: false,
                });
                await supabase.from('conversations').update({
                  updated_at: new Date().toISOString(),
                }).eq('id', savedConv.id);
              }
            }
          } catch (convErr) {
            console.warn('[Sync API] Error writing conversation to Supabase:', convErr);
          }
        }

        const exists = memory.conversations.some((c) => c.id === savedConv.id);
        const updatedConversations = exists 
          ? memory.conversations.map((c) => (c.id === savedConv.id ? { ...c, ...savedConv } : c))
          : [savedConv, ...memory.conversations];

        let updatedMessages = memory.messages;
        if (initialMessage && initialMessage.trim()) {
          const initialMsgRecord = {
            id: `msg-${Date.now()}`,
            conversationId: savedConv.id,
            senderId: user?.id || conversation.participantOneId,
            senderName: payload.isAnonymous ? 'Elmina Neighbour (Anonymous)' : (user?.displayName || user?.fullName || 'Resident'),
            senderAvatar: payload.isAnonymous ? undefined : user?.avatarUrl,
            isAnonymous: Boolean(payload.isAnonymous),
            content: initialMessage.trim(),
            createdAt: new Date().toISOString(),
          };
          updatedMessages = [...memory.messages.filter((m) => m.id !== initialMsgRecord.id), initialMsgRecord];
        }

        updateMemoryStore({ conversations: updatedConversations, messages: updatedMessages });
        resultRecord = { conversation: savedConv };
        break;
      }

      case 'REGISTER_PROPERTY_ADDRESS': {
        const { targetId, precinct, unitNumber, displayName } = payload;
        const normalizedProp = {
          targetId: targetId || user?.id,
          precinct: precinct || user?.townshipPrecinct || 'Bandar Elmina',
          unitNumber: unitNumber || user?.unitNumber || '',
          maskedProperty: unitNumber || `Residence ${precinct || 'Bandar Elmina'}`,
          displayName: displayName || user?.displayName || user?.fullName || 'Resident',
        };
        const updatedProps = [
          ...memory.registeredProperties.filter((p) => p.targetId !== normalizedProp.targetId),
          normalizedProp,
        ];
        updateMemoryStore({ registeredProperties: updatedProps });
        resultRecord = { success: true, property: normalizedProp };
        break;
      }

      case 'SEARCH_PROPERTIES': {
        const { query } = payload;
        const clean = (query || '').toLowerCase().trim();
        const results = memory.registeredProperties.filter((p) => {
          if (user?.id && (p.targetId === user.id || toDatabaseUserId(p.targetId) === toDatabaseUserId(user.id))) {
            return false;
          }
          const matchesUnit = p.unitNumber && p.unitNumber.toLowerCase().includes(clean);
          const matchesPrecinct = p.precinct && p.precinct.toLowerCase().includes(clean);
          const matchesMasked = p.maskedProperty && p.maskedProperty.toLowerCase().includes(clean);
          return matchesUnit || matchesPrecinct || matchesMasked;
        }).map((p) => ({
          targetId: p.targetId,
          precinct: p.precinct,
          maskedProperty: p.maskedProperty,
        }));
        resultRecord = { results: results.slice(0, 10) };
        break;
      }

      case 'SEND_MESSAGE_REQUEST': {
        const { request: msgReq } = payload;
        const senderUuid = toDatabaseUserId(user?.id || msgReq.senderId);
        const recipientUuid = toDatabaseUserId(msgReq.recipientId);

        let savedReq = {
          ...msgReq,
          id: msgReq.id || `req-${Date.now()}`,
          senderId: user?.id || msgReq.senderId,
          recipientId: msgReq.recipientId,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
        };

        if (supabase && senderUuid !== recipientUuid) {
          try {
            const { data: inserted, error: insErr } = await supabase
              .from('property_message_requests')
              .insert({
                sender_id: senderUuid,
                recipient_id: recipientUuid,
                property_address: msgReq.propertyAddress,
                subject: msgReq.subject,
                initial_message: msgReq.initialMessage,
                is_anonymous: Boolean(msgReq.isAnonymous),
                sender_display_name: msgReq.isAnonymous ? 'Elmina Neighbour (Anonymous)' : (msgReq.senderDisplayName || user?.displayName || 'Resident'),
                status: 'pending',
              })
              .select()
              .single();

            if (!insErr && inserted) {
              savedReq.id = inserted.id;
              savedReq.createdAt = inserted.created_at;
            }
          } catch (reqErr) {
            console.warn('[Sync API] Error writing message request to Supabase:', reqErr);
          }
        }

        const updatedRequests = [savedReq, ...memory.messageRequests.filter((r) => r.id !== savedReq.id)];
        updateMemoryStore({ messageRequests: updatedRequests });
        resultRecord = savedReq;
        break;
      }

      case 'ACCEPT_MESSAGE_REQUEST': {
        const { requestId } = payload;
        const req = memory.messageRequests.find((r) => r.id === requestId);
        const senderId = req?.senderId || payload.senderId;
        const recipientId = user?.id || req?.recipientId;

        const senderUuid = toDatabaseUserId(senderId);
        const recipientUuid = toDatabaseUserId(recipientId);

        let convId = req?.conversationId || `conv-${Date.now()}`;
        let savedConv = {
          id: convId,
          participantOneId: senderId,
          participantOneName: req?.senderDisplayName || 'Resident Neighbour',
          participantTwoId: recipientId,
          participantTwoName: user?.displayName || user?.fullName || 'Resident',
          subject: req?.subject || 'Property Message',
          contextType: 'general' as const,
          status: 'accepted' as const,
          lastMessage: req?.initialMessage || '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        };

        let savedMsg = {
          id: `msg-${Date.now()}`,
          conversationId: convId,
          senderId: senderId,
          senderName: req?.senderDisplayName || 'Neighbour',
          isAnonymous: Boolean(req?.isAnonymous),
          content: req?.initialMessage || '',
          createdAt: req?.createdAt || new Date().toISOString(),
        };

        if (supabase) {
          try {
            // Check if canonical conversation already exists in database
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('*')
              .or(`and(participant_one.eq.${senderUuid},participant_two.eq.${recipientUuid}),and(participant_one.eq.${recipientUuid},participant_two.eq.${senderUuid})`)
              .maybeSingle();

            if (existingConv) {
              convId = existingConv.id;
              savedConv.id = convId;
              savedConv.subject = existingConv.subject || savedConv.subject;
              await supabase.from('conversations').update({
                updated_at: new Date().toISOString(),
              }).eq('id', convId);
            } else {
              const { data: newDbConv, error: newDbConvErr } = await supabase
                .from('conversations')
                .insert({
                  participant_one: senderUuid,
                  participant_two: recipientUuid,
                  subject: req?.subject || 'Property Message',
                  context_type: 'general',
                  updated_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (!newDbConvErr && newDbConv) {
                convId = newDbConv.id;
                savedConv.id = convId;
              }
            }

            savedMsg.conversationId = convId;

            if (req?.initialMessage) {
              const { data: newDbMsg, error: newDbMsgErr } = await supabase
                .from('messages')
                .insert({
                  conversation_id: convId,
                  sender_id: senderUuid,
                  content: req.initialMessage,
                  is_read: false,
                })
                .select()
                .single();

              if (!newDbMsgErr && newDbMsg) {
                savedMsg.id = newDbMsg.id;
                savedMsg.createdAt = newDbMsg.created_at;
              }
            }

            const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
            if (isReqUuid) {
              await supabase
                .from('property_message_requests')
                .update({
                  status: 'accepted',
                  conversation_id: convId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', requestId);
            }
          } catch (accErr) {
            console.warn('[Sync API] Error in accept_message_request Supabase persistence:', accErr);
          }
        }

        const updatedRequests = memory.messageRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'accepted' as const, conversationId: convId } : r
        );
        const updatedConvs = [savedConv, ...memory.conversations.filter((c) => c.id !== convId)];
        const updatedMsgs = [savedMsg, ...memory.messages.filter((m) => m.id !== savedMsg.id)];

        updateMemoryStore({
          messageRequests: updatedRequests,
          conversations: updatedConvs,
          messages: updatedMsgs,
        });

        resultRecord = {
          conversationId: convId,
          conversation: savedConv,
          initialMessage: savedMsg,
          requestId,
        };
        break;
      }

      case 'REJECT_MESSAGE_REQUEST': {
        const { requestId } = payload;
        if (supabase) {
          const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
          if (isReqUuid) {
            await supabase
              .from('property_message_requests')
              .update({ status: 'rejected', updated_at: new Date().toISOString() })
              .eq('id', requestId);
          }
        }
        const updatedRequests = memory.messageRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected' as const } : r
        );
        updateMemoryStore({ messageRequests: updatedRequests });
        resultRecord = { requestId, status: 'rejected' };
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
