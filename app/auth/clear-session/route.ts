import { NextResponse, type NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

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
// Must never be statically prerendered at build time (it unconditionally
// constructs a Supabase client, which requires env vars that aren't present
// during `next build`) — always run per-request.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerClient(request)
  await supabase.auth.signOut({ scope: 'local' })

  // Preserve the page the visitor was actually trying to reach so they land
  // back there after logging in, instead of always dropping to /dashboard.
  const { searchParams } = new URL(request.url)
  const redirectedFrom = searchParams.get('redirectedFrom')
  const loginUrl = new URL('/auth/login', request.url)
  if (redirectedFrom && /^\/[^/\\]/.test(redirectedFrom)) {
    loginUrl.searchParams.set('redirectedFrom', redirectedFrom)
  }

  return applyCookies(NextResponse.redirect(loginUrl))
}
