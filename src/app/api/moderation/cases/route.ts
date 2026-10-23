import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { 
  getUnifiedCases, 
  getManualReports, 
  getAiModerationQueue, 
  getFalsePositiveStats,
  getModerationHealth,
  upsertDatabaseReports
} from '@/lib/server/moderationStore';
import { getSupabaseAdmin } from '@/lib/server/dbSync';
import type { ModerationReport } from '@/types';

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
 * GET /api/moderation/cases
 * Returns all unified moderation cases, manual reports, AI flags, and health telemetry.
 * Strictly restricted to management role (403 for residents).
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
      { error: 'Forbidden: Access restricted to authorized township management personnel.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 1. Durably synchronize with Supabase moderation_reports table
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: dbReports } = await supabase
        .from('moderation_reports')
        .select('*, reporter:public_profiles(full_name, township_precinct)');
      if (Array.isArray(dbReports) && dbReports.length > 0) {
        const mapped: ModerationReport[] = dbReports.map((r: any) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterName: r.reporter?.full_name || 'Resident',
          targetType: r.target_type === 'comment' ? 'reply' : r.target_type,
          targetId: r.target_id,
          reason: r.reason,
          details: r.details,
          status: r.status,
          reviewedBy: r.resolution_note ? 'Duty Management' : undefined,
          resolutionNote: r.resolution_note,
          createdAt: r.created_at,
        }));
        upsertDatabaseReports(mapped);
      }
    } catch (e) {
      console.warn('[moderation/cases] Supabase sync warning:', e);
    }
  }

  const cases = getUnifiedCases();
  const reports = getManualReports();
  const aiQueue = getAiModerationQueue();
  const falsePositiveStats = getFalsePositiveStats();
  const health = getModerationHealth();

  return NextResponse.json({
    success: true,
    cases,
    reports,
    aiQueue,
    falsePositiveStats,
    health,
  });
}

