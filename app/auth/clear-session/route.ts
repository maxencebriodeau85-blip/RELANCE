import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Must never be statically prerendered at build time (it unconditionally
// constructs a Supabase client, which requires env vars that aren't present
// during `next build`) — always run per-request.
export const dynamic = 'force-dynamic'

// Server Components (dashboard/layout.tsx, subscription/page.tsx, …) discover
// a stale/invalid session via getUser(), but they CANNOT clear cookies — Next.js
// only allows cookie writes from Route Handlers and Server Actions, so
// lib/supabase/server.ts's cookie setters silently no-op there. Redirecting
// straight to /auth/login from a Server Component therefore leaves the bad
// `sb-*-auth-token` cookie in place; middleware's cookie-PRESENCE check (it
// can't validate tokens without a network call, see middleware.ts) then
// immediately bounces that /auth/login request back to /dashboard — an
// infinite redirect loop that never shows the login form. This Route Handler
// can mutate cookies, so it clears the stale session before handing off to
// the actual login page.
//
// Cookie mutations are collected and attached explicitly to the redirect
// response (same pattern as app/auth/callback/route.ts) rather than relying
// on next/headers cookies() auto-attachment, which is not guaranteed to
// merge onto a separately-constructed NextResponse.redirect().
export async function GET(request: NextRequest) {
  const cookiesToClear: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToClear.push(...cookiesToSet)
        },
      },
    }
  )

  await supabase.auth.signOut({ scope: 'local' })

  const response = NextResponse.redirect(new URL('/auth/login', request.url))
  cookiesToClear.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
