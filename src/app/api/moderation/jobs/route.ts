import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { getModerationJobs, getModerationHealth } from '@/lib/server/moderationStore';
import { processModerationJob } from '@/lib/server/aiModeration';

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
 * GET /api/moderation/jobs
 * Retrieves background moderation jobs and engine health telemetry.
 * Strictly restricted to management.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'management') {
    return NextResponse.json(
      { error: 'Forbidden: Management access required.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  const jobs = getModerationJobs();
  const health = getModerationHealth();

  return NextResponse.json({
    success: true,
    jobs,
    health,
  });
}

/**
 * POST /api/moderation/jobs
 * Triggers re-processing / retry of a specific job or all failed jobs.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user || user.role !== 'management') {
    return NextResponse.json(
      { error: 'Forbidden: Management access required.', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { jobId, retryAllFailed } = body;

    const allJobs = getModerationJobs();

    if (retryAllFailed) {
      const failedJobs = allJobs.filter((j) => j.status === 'failed' || j.status === 'retry_scheduled');
      const results = [];
      for (const job of failedJobs) {
        const processed = await processModerationJob(job);
        results.push(processed);
      }
      return NextResponse.json({
        success: true,
        retriedCount: results.length,
        jobs: results,
      });
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId or retryAllFailed is required.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const targetJob = allJobs.find((j) => j.id === jobId);
    if (!targetJob) {
      return NextResponse.json(
        { error: 'Moderation job not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const processed = await processModerationJob(targetJob);
    return NextResponse.json({
      success: true,
      job: processed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Job retry failed.';
    return NextResponse.json(
      { error: message, code: 'JOB_RETRY_ERROR' },
      { status: 500 }
    );
  }
}
