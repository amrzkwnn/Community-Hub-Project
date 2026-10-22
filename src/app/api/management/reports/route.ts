import { NextRequest, NextResponse } from 'next/server';
import { requireManagementOfficer } from '@/lib/server/managementAuth';
import { computeManagementAnalytics } from '@/lib/server/managementAnalytics';
import { generateManagementReport } from '@/lib/server/managementAi';
import { createClient } from '@/lib/supabase/server';
import { ManagementReportType } from '@/types';

/**
 * POST /api/management/reports
 * Generates structured, evidence-based operational reports on explicit management request
 */
export async function POST(request: NextRequest) {
  const auth = await requireManagementOfficer(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const reportType: ManagementReportType = body.type || 'monthly';
  const period = (body.period as '7d' | '30d' | '90d' | 'custom') || '30d';

  let supabase = null;
  try {
    supabase = await createClient();
  } catch {}

  const { dataset } = await computeManagementAnalytics(supabase, period);
  const report = await generateManagementReport(reportType, dataset, auth.officer.name);

  return NextResponse.json({
    success: true,
    report,
    generatedAt: new Date().toISOString(),
  });
}
