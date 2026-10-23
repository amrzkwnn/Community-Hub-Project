import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseKey = 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl === '[SENSITIVE]' || !supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://jtgehvobgezbrwohelry.supabase.co';
  }
  if (!supabaseKey || supabaseKey === '[SENSITIVE]') {
    supabaseKey = 'sb_publishable_beFqZsLvjGIypNn-7Zvtyw_CvGhNFvu';
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
