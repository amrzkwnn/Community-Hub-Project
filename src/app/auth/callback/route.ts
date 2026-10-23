import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback
 * Handles Supabase Auth email confirmation callbacks, exchangeCodeForSession,
 * and securely redirects verified residents to the Community Hub.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        console.warn('[Auth Callback] Code exchange error:', error.message);
      }
    } catch (err) {
      console.error('[Auth Callback] Unexpected error during code exchange:', err);
    }
  }

  // If verification failed or link expired, redirect with error query parameter
  return NextResponse.redirect(`${origin}/?auth_error=expired_verification_link`);
}
