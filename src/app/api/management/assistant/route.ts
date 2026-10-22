import { NextRequest, NextResponse } from 'next/server';
import { requireManagementOfficer } from '@/lib/server/managementAuth';
import { computeManagementAnalytics } from '@/lib/server/managementAnalytics';
import { askManagementAssistant } from '@/lib/server/managementAi';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/management/assistant
 * Handles natural-language analytical questions from authorized management personnel.
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

  const query = (body.query || '').trim();
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const language = body.language || 'en';

  let supabase = null;
  try {
    supabase = await createClient();
  } catch {}

  const { dataset } = await computeManagementAnalytics(supabase, '30d');
  const message = await askManagementAssistant(query, history, dataset, language);

  return NextResponse.json({
    success: true,
    message,
    officer: {
      id: auth.officer.id,
      name: auth.officer.name,
      role: auth.officer.role,
    },
  });
}
