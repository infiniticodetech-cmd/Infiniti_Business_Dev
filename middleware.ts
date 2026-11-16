
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from './lib/db/types';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes
  if (pathname === '/login' || pathname === '/api/health') {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });

            response = NextResponse.next({ request });

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch {
    // Fail closed if authentication cannot be verified.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
