import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';

export function createClientBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key';

  return createBrowserClient<Database>(url, key);
}
