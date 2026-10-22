import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { executeManagementModerationAction } from '@/lib/server/aiModeration';

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
    // Fall through
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
 * POST /api/ai/moderate/action
 * Management-only endpoint to execute moderation decisions:
 * - dismiss: False positive or no violation
 * - keep: Content verified and permitted
 * - remove: Content violates policy and is soft-removed
 * - further_review: Marked for deeper investigation
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  if (user.role !== 'management') {
    return NextResponse.json(
      { error: 'Forbidden: Only authorized management accounts can action moderation records.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { itemId, decision, note } = body;

    const validDecisions = ['dismissed', 'kept', 'removed', 'further_review'];
    if (!itemId || !validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid parameters: itemId and a valid decision are required.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const result = executeManagementModerationAction({
      itemId,
      decision,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      note,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to action moderation item.', code: 'ACTION_FAILED' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.item,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed.';
    return NextResponse.json(
      { error: message, code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
