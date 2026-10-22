import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { 
  moderateCommunityContent, 
  getModerationQueue, 
  getFalsePositiveStats,
  processModerationJob
} from '@/lib/server/aiModeration';
import { enqueueModerationJob } from '@/lib/server/moderationStore';

async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; role: string; name: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        role: user.user_metadata?.role || 'resident',
        name: user.user_metadata?.full_name || 'Resident',
      };
    }
  } catch {
    // Fall through to session token validation
  }

  const sessionHeader = request.headers.get('x-tesdh-session') || 
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (sessionHeader) {
    const matchedProfile = INITIAL_PROFILES.find((p) => p.id === sessionHeader);
    if (matchedProfile) {
      return {
        id: matchedProfile.id,
        role: matchedProfile.role,
        name: matchedProfile.fullName,
      };
    }
  }

  return null;
}

/**
 * GET /api/ai/moderate
 * Fetch the AI moderation review queue and false-positive statistics.
 * Strictly restricted to management role.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  if (user.role !== 'management') {
    return NextResponse.json(
      { error: 'Access restricted: Only authorized management personnel may view the moderation queue.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  const queue = getModerationQueue();
  const falsePositiveStats = getFalsePositiveStats();

  return NextResponse.json({
    success: true,
    queue,
    falsePositiveStats,
  });
}

/**
 * POST /api/ai/moderate
 * Evaluates public community content (posts, comments, listings, services) for policy compliance.
 * Does not scan private messages, attachments, or personal profiles.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { contentType, contentId, contentTitle, contentText } = body;

    if (!contentType || !contentId || typeof contentText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid payload: contentType, contentId, and contentText are required.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Verify content type is within public community moderation scope
    const validTypes = ['post', 'reply', 'exchange', 'service'];
    if (!validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid contentType "${contentType}". Private communications cannot be scanned.`, code: 'SCOPE_VIOLATION' },
        { status: 400 }
      );
    }

    // Enqueue durable background job
    const job = enqueueModerationJob({
      contentType,
      contentId,
      authorId: user.id,
      authorName: user.name,
      contentTitle: contentTitle ? String(contentTitle) : undefined,
      contentText: String(contentText),
    });

    // Execute job
    const processedJob = await processModerationJob(job);
    const result = processedJob.result || (await moderateCommunityContent({
      contentType,
      contentId,
      authorId: user.id,
      authorName: user.name,
      contentTitle: contentTitle ? String(contentTitle) : undefined,
      contentText: String(contentText),
    }));

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobStatus: processedJob.status,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Moderation analysis failed.';
    return NextResponse.json(
      { error: message, code: 'MODERATION_ERROR' },
      { status: 500 }
    );
  }
}
