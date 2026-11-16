import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './lib/db/types';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key';

  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh user session if present
    const { data: { user } } = await supabase.auth.getUser();

    // If accessing protected (app) routes without being logged in, redirect to login
    // Note: in local mock/dev testing without Supabase auth running, we allow bypass if AUTH_BYPASS=true
    const isAppRoute = !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/api') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      request.nextUrl.pathname !== '/favicon.ico';

    if (isAppRoute && !user && process.env.AUTH_BYPASS !== 'true') {
      // In production/normal mode: redirect to /login
      // If user isn't logged in, redirect to login
      // For local development ease, check if user session exists:
      if (process.env.NODE_ENV === 'production') {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
      }
    }
  } catch (err) {
    // If Supabase is offline in dev, allow navigation to settings to inspect health
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
