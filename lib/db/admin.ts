import { createClient } from '@supabase/supabase-js';
import { Database } from './types';
import { env } from '../config/env';

/**
 * Supabase admin client using the service role key.
 * Strictly for server-side pipeline operations. Never exposed to browser.
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
