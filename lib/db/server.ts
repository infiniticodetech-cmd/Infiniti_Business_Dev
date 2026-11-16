
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './types';
import { env } from '../config/env';
import type { CookieOptions } from '@supabase/ssr';

export async function createClientServer() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookie updates from Server Components may not be permitted.
            // Middleware can handle session refresh.
          }
        },
      },
    }
  );
}
