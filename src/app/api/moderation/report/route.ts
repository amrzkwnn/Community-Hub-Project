import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { addManualReport } from '@/lib/server/moderationStore';
import type { ModerationReason } from '@/types';

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
 * POST /api/moderation/report
 * Submits a resident content report. Validates authentication and payload,
 * prevents accidental rapid duplicate clicks, and durably persists the report.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required to report content.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { targetType, targetId, targetTitle, targetContent, reason, details } = body;

    const validTargetTypes = ['post', 'comment', 'reply', 'service', 'exchange', 'incident', 'user'];
    if (!targetType || !validTargetTypes.includes(targetType) || !targetId) {
      return NextResponse.json(
        { error: 'Invalid report: targetType and targetId are required.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const validReasons: string[] = [
      'spam',
      'harassment',
      'hate_speech',
      'offensive_language',
      'threats_violence',
      'scam_fraud',
      'false_information',
      'inappropriate',
      'duplicate',
      'privacy_violation',
      'dangerous_content',
      'scam',
      'other',
    ];

    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid report reason.', code: 'INVALID_REASON' },
        { status: 400 }
      );
    }

    // Persist to durable store
    const { report, unifiedCase, isDuplicate } = addManualReport({
      reporterId: user.id,
      reporterName: user.name,
      targetType,
      targetId,
      targetTitle: targetTitle ? String(targetTitle) : undefined,
      targetContent: targetContent ? String(targetContent) : undefined,
      reason,
      details: details ? String(details).trim() : undefined,
    });

    // Attempt durable Supabase persistence
    try {
      const { getSupabaseAdmin, toDatabaseUserId } = await import('@/lib/server/dbSync');
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const mappedReason = ['spam', 'harassment', 'false_information', 'inappropriate', 'duplicate', 'privacy_violation'].includes(reason)
          ? reason
          : 'other';

        const reporterUuid = toDatabaseUserId(user.id);
        const targetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId) 
          ? targetId 
          : toDatabaseUserId(targetId);

        await supabaseAdmin.from('moderation_reports').upsert({
          id: report.id,
          reporter_id: reporterUuid,
          target_type: targetType === 'comment' ? 'reply' : targetType,
          target_id: targetUuid,
          reason: mappedReason,
          details: details || null,
          status: 'pending',
          created_at: report.createdAt,
        });
      }
    } catch (dbErr) {
      console.warn('[moderation/report] Supabase insertion warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      report,
      unifiedCase,
      isDuplicate,
      message: isDuplicate 
        ? 'A report for this content was recently received and is under review.'
        : 'Report submitted successfully. Our township moderation team has received it.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit report.';
    return NextResponse.json(
      { error: message, code: 'REPORT_SUBMISSION_ERROR' },
      { status: 500 }
    );
  }
}
