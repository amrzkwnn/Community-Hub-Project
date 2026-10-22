import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { INITIAL_PROFILES } from '@/lib/data/mockData';
import { runExchangeListingAssist } from '@/lib/server/aiListingAssistant';

async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { id: user.id };
  } catch {
    // Fallback
  }

  const sessionHeader = request.headers.get('x-tesdh-session') || 
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (sessionHeader) {
    const matchedProfile = INITIAL_PROFILES.find((p) => p.id === sessionHeader);
    if (matchedProfile) return { id: matchedProfile.id };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required to use AI Listing Assistant.', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, title, description, category, listingType } = body;

    const validActions = ['suggest_category', 'suggest_title', 'improve_description'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action: must be suggest_category, suggest_title, or improve_description.', code: 'INVALID_ACTION' },
        { status: 400 }
      );
    }

    const result = await runExchangeListingAssist({
      action,
      title: typeof title === 'string' ? title : undefined,
      description: typeof description === 'string' ? description : undefined,
      category: typeof category === 'string' ? category : undefined,
      listingType: listingType === 'exchange' || listingType === 'loan' ? listingType : 'giveaway',
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Listing assistance failed.';
    return NextResponse.json(
      { error: message, code: 'ASSIST_FAILED' },
      { status: 500 }
    );
  }
}
