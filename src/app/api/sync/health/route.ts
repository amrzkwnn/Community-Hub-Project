import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const postgresUrl = process.env.POSTGRES_URL;

  let serviceClientWorking = false;
  let serviceError = null;
  let reportsCount = 0;

  if (supabaseUrl && serviceKey && serviceKey !== '[SENSITIVE]') {
    try {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { count, error } = await admin.from('community_reports').select('*', { count: 'exact', head: true });
      if (!error) {
        serviceClientWorking = true;
        reportsCount = count || 0;
      } else {
        serviceError = error.message;
      }
    } catch (e: any) {
      serviceError = e.message;
    }
  }

  return NextResponse.json({
    status: 'ok',
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(anonKey),
    hasServiceKey: Boolean(serviceKey && serviceKey !== '[SENSITIVE]'),
    hasPostgresUrl: Boolean(postgresUrl && postgresUrl !== '[SENSITIVE]'),
    serviceClientWorking,
    serviceError,
    reportsCount,
    timestamp: new Date().toISOString()
  });
}
