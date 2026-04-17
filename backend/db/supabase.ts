/**
 * supabase.ts — Supabase client singleton.
 * All DB writes go through this client. Only imported when ENABLE_DB_WRITES is true.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('[supabase] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
