import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildGroundedContext } from '@/lib/server/aiContext';
import { executeAiSmartSearch } from '@/lib/server/aiSearch';
import { generateAssistantResponse, resolveGeminiApiKey, type ChatMessage } from '@/lib/server/geminiClient';
import { INITIAL_PROFILES } from '@/lib/data/mockData';

// Simple in-memory sliding window rate limiter (10 requests per 60 seconds per client)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];

  // Filter out timestamps older than the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(clientId, recent);
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  rateLimitMap.set(clientId, recent);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - recent.length };
}

export async function GET(_request?: NextRequest) {
  resolveGeminiApiKey();
  const apiKeyConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  return NextResponse.json({
    status: 'online',
    service: 'TESDH AI Assistant API',
    apiKeyConfigured,
    preferredModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    supportedLanguages: ['en', 'bm'],
    privacyPolicy: 'Zero Conversation Persistence. Masked PII.',
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Request
    let authenticatedUser: { id: string; role: string; name: string } | null = null;

    // Check Supabase session via cookies
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        authenticatedUser = {
          id: user.id,
          role: user.user_metadata?.role || 'resident',
          name: user.user_metadata?.full_name || 'Resident',
        };
      }
    } catch {
      // Supabase client error or missing env vars handled below
    }

    // Fallback: Check verified resident session token / header
    if (!authenticatedUser) {
      const sessionHeader = request.headers.get('x-tesdh-session') || 
        request.headers.get('authorization')?.replace('Bearer ', '');

      if (sessionHeader) {
        // Validate against known resident profiles
        const matchedProfile = INITIAL_PROFILES.find((p) => p.id === sessionHeader);
        if (matchedProfile) {
          authenticatedUser = {
            id: matchedProfile.id,
            role: matchedProfile.role,
            name: matchedProfile.fullName,
          };
        }
      }
    }

    // Require valid authentication
    if (!authenticatedUser) {
      return NextResponse.json(
        { 
          error: 'Authentication required. Please sign in to access the TESDH AI Assistant.',
          code: 'UNAUTHENTICATED'
        },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Check
    const clientIdentifier = authenticatedUser.id || 
      request.headers.get('x-forwarded-for') || 
      'anonymous-client';
    
    const rateLimit = checkRateLimit(clientIdentifier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can send up to 10 queries per minute to the TESDH AI Assistant. Please wait a moment and try again.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // 3. Parse & Validate Payload
    let body: { message?: unknown; history?: unknown; preferredLanguage?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const { message, history, preferredLanguage } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt message cannot be empty.', code: 'EMPTY_MESSAGE' },
        { status: 400 }
      );
    }

    if (message.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Message exceeds the maximum limit of 1,000 characters.', code: 'MESSAGE_TOO_LONG' },
        { status: 400 }
      );
    }

    // Sanitize conversation history (4-6 turns, 300 char budget per turn)
    const sanitizedHistory: ChatMessage[] = Array.isArray(history)
      ? history
          .filter((turn): turn is { role: 'user' | 'model'; text: string } => 
            Boolean(turn && typeof turn.text === 'string' && (turn.role === 'user' || turn.role === 'model'))
          )
          .slice(-4)
          .map((turn) => ({
            role: turn.role,
            text: turn.text.trim().slice(0, 300),
          }))
      : [];

    // 4. Retrieve Grounded Context & Smart Search Results
    let supabaseClient = null;
    try {
      supabaseClient = await createClient();
    } catch {}

    const [{ cards, incidentReporting }, groundedContext] = await Promise.all([
      executeAiSmartSearch(message.trim(), {
        supabase: supabaseClient,
        preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : undefined,
      }),
      buildGroundedContext(supabaseClient, {
        userId: authenticatedUser.id,
        userRole: authenticatedUser.role,
        query: message.trim(),
      }),
    ]);

    // If matching search cards are found, enrich prompt context
    let enrichedContext = groundedContext;
    if (cards.length > 0) {
      const cardSummaries = cards
        .map((c) => `- [${c.type.toUpperCase()}] "${c.title}" (ID: ${c.id}) | Status: ${c.status} | Location: ${c.location || 'Elmina'} | Details: ${c.descriptionSnippet}`)
        .join('\n');
      enrichedContext += `\n\n[MATCHING COMMUNITY RESULT CARDS]:\n${cardSummaries}\nIMPORTANT: Interactive cards with direct navigation links are automatically rendered below your response. Provide a direct, friendly 1-2 sentence summary introducing these matching results. Do not repeat full record dumps in prose.`;
    }

    // If incident reporting assistance was triggered
    if (incidentReporting && incidentReporting.isReportingIntent) {
      enrichedContext += `\n\n[INCIDENT REPORTING ASSISTANCE TRIGGERED]:
- Resident Query: "${message.trim()}"
- Suggested Category: ${incidentReporting.suggestedCategoryLabel} (${incidentReporting.suggestedCategory})
- Drafted Title: ${incidentReporting.draftTitle}
- Drafted Factual Description: ${incidentReporting.draftDescription}
- Location Detected: ${incidentReporting.detectedLocationName || 'Persiaran Elmina'}
- Potential Duplicates Found: ${incidentReporting.duplicates.length} active incident(s) in this area/category
INSTRUCTIONS:
1. Acknowledge what the resident noticed concisely and empathetically.
2. Confirm you suggested the category "${incidentReporting.suggestedCategoryLabel}" and drafted a factual description.
3. ${incidentReporting.duplicates.length > 0 ? 'Advise them to check the existing report card first to avoid submitting a duplicate.' : 'Note that no matching duplicate report was detected in active records.'}
4. Remind them they can click "Report This Incident" to confirm the exact location pin on the Resilience Map within Elmina before submitting.
5. Reiterate that the AI does NOT auto-submit or verify incidents; all reports require resident map confirmation and management verification.`;
    }

    // 5. Generate AI Response with Timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 20000); // 20s timeout

    try {
      const result = await generateAssistantResponse({
        message: message.trim(),
        history: sanitizedHistory,
        groundedContext: enrichedContext,
        preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : undefined,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!result.success) {
        // If smart search or reporting draft found cards, residents can still view results even if Gemini hits quota
        if (cards.length > 0) {
          const isMalay = preferredLanguage === 'bm' || preferredLanguage === 'ms-MY';
          let fallbackText: string;

          if (incidentReporting && incidentReporting.isReportingIntent) {
            if (incidentReporting.duplicates.length > 0) {
              fallbackText = isMalay
                ? `Saya telah mencadangkan kategori "${incidentReporting.suggestedCategoryLabel}" dan draf laporan untuk anda. Terdapat juga ${incidentReporting.duplicates.length} laporan sedia ada yang mungkin berkaitan di kawasan ini. Sila semak laporan sedia ada atau klik "Lapor Insiden Ini" untuk sahkan lokasi di Peta Ketahanan:`
                : `I have suggested the category "${incidentReporting.suggestedCategoryLabel}" and prepared a factual report draft. There is also an existing report in this area. Please review the existing report or click "Report This Incident" to confirm your location on the Resilience Map:`;
            } else {
              fallbackText = isMalay
                ? `Saya telah mencadangkan kategori "${incidentReporting.suggestedCategoryLabel}" dan draf laporan untuk anda. Sila klik "Lapor Insiden Ini" untuk memilih dan mengesahkan lokasi di Peta Ketahanan sebelum menghantar:`
                : `I have suggested the category "${incidentReporting.suggestedCategoryLabel}" and drafted a factual report. Click "Report This Incident" below to confirm the exact location on the Resilience Map before submitting:`;
            }
          } else {
            fallbackText = isMalay
              ? 'Berikut adalah rekod komuniti TESDH yang sepadan dengan carian anda. Klik pada kad untuk paparan penuh:'
              : 'Here are the matching TESDH community records found. Click any card below to open details directly:';
          }

          return NextResponse.json({
            success: true,
            answer: fallbackText,
            cards,
            model: 'offline-smart-search',
            timestamp: new Date().toISOString(),
          });
        }

        const isQuota = result.error === 'RATE_LIMIT_EXHAUSTED';
        const isMissingKey = result.error === 'GEMINI_API_KEY_MISSING';
        
        return NextResponse.json(
          {
            success: false,
            answer: result.text,
            cards: [],
            error: result.error,
            model: result.modelUsed,
          },
          { status: isQuota ? 429 : isMissingKey ? 503 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        answer: result.text,
        cards,
        model: result.modelUsed,
        metrics: result.metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (genErr: unknown) {
      clearTimeout(timeoutId);
      const errMsg = genErr instanceof Error ? genErr.message : 'INTERNAL_ERROR';
      return NextResponse.json(
        {
          success: false,
          answer: 'The TESDH AI Assistant encountered a temporary communication issue. Please try again.',
          error: errMsg,
        },
        { status: 500 }
      );
    }
  } catch (_error: unknown) {
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while processing your request.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
