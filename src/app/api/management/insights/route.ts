import { NextRequest, NextResponse } from 'next/server';
import { requireManagementOfficer } from '@/lib/server/managementAuth';
import { computeManagementAnalytics } from '@/lib/server/managementAnalytics';
import { generateManagementInsights } from '@/lib/server/managementAi';
import { createClient } from '@/lib/supabase/server';
import { GEMINI_CONFIG } from '@/lib/server/geminiClient';

// Short in-memory cache to prevent redundant Gemini API calls on rapid refreshes
let cachedInsights: { timestamp: number; period: string; insights: any[] } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * POST /api/management/insights
 * Generates structured, evidence-based AI Management Insights
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

  const period = (body.period as '7d' | '30d' | '90d' | 'custom') || '30d';
  const forceRefresh = !!body.forceRefresh;

  const now = Date.now();
  if (!forceRefresh && cachedInsights && cachedInsights.period === period && now - cachedInsights.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      insights: cachedInsights.insights,
      cached: true,
      modelUsed: GEMINI_CONFIG.model,
      timestamp: new Date(cachedInsights.timestamp).toISOString(),
    });
  }

  let supabase = null;
  try {
    supabase = await createClient();
  } catch {}

  const { dataset } = await computeManagementAnalytics(supabase, period);
  const insights = await generateManagementInsights(dataset);

  cachedInsights = {
    timestamp: now,
    period,
    insights,
  };

  return NextResponse.json({
    success: true,
    insights,
    cached: false,
    modelUsed: GEMINI_CONFIG.model,
    timestamp: new Date().toISOString(),
  });
}
