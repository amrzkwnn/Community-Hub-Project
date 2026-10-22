import { NextRequest, NextResponse } from 'next/server';
import { requireManagementOfficer } from '@/lib/server/managementAuth';
import { computeManagementAnalytics } from '@/lib/server/managementAnalytics';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/management/analytics
 * Parameters:
 *   - period: '7d' | '30d' | '90d' | 'custom' (default: '30d')
 *   - from: ISO date string for custom period
 */
export async function GET(request: NextRequest) {
  const auth = await requireManagementOfficer(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as '7d' | '30d' | '90d' | 'custom') || '30d';
  const customFrom = searchParams.get('from') || undefined;

  let supabase = null;
  try {
    supabase = await createClient();
  } catch {}

  const { dataset, alerts } = await computeManagementAnalytics(supabase, period, customFrom);

  return NextResponse.json({
    success: true,
    dataset,
    alerts,
    timestamp: new Date().toISOString(),
  });
}
