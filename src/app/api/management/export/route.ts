import { NextRequest, NextResponse } from 'next/server';
import { requireManagementOfficer } from '@/lib/server/managementAuth';
import { computeManagementAnalytics, exportAnalyticsToCsv } from '@/lib/server/managementAnalytics';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/management/export
 * Downloads authorized operational analytics in CSV format
 */
export async function GET(request: NextRequest) {
  const auth = await requireManagementOfficer(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as '7d' | '30d' | '90d' | 'custom') || '30d';

  let supabase = null;
  try {
    supabase = await createClient();
  } catch {}

  const { dataset } = await computeManagementAnalytics(supabase, period);
  const csvContent = exportAnalyticsToCsv(dataset);

  const filename = `tesdh-management-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
