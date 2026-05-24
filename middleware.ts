import { NextResponse, type NextRequest } from 'next/server'

// Synchronous middleware — zero network calls, zero SDK overhead.
//
// Supabase recommends calling auth.getUser() in middleware, but on Vercel's
// Edge Runtime that HTTP round-trip consistently causes
// MIDDLEWARE_INVOCATION_TIMEOUT (504).
//
// Solution: check for the presence of the Supabase session cookie directly.
// Expired or invalid tokens are caught by createClient().auth.getUser() in
// every Server Component / Route Handler, which has a much higher timeout
// budget and runs in the Node.js runtime (not Edge).

function hasSessionCookie(request: NextRequest): boolean {
  // @supabase/ssr stores the session in a cookie named:
  //   sb-<project-ref>-auth-token          (small JWTs)
  //   sb-<project-ref>-auth-token.0/.1/…  (chunked large JWTs)
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const loggedIn = hasSessionCookie(request)

  // ── Protected routes ──────────────────────────────────────────────────────
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/invoices') ||
    pathname.startsWith('/api/contacts') ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/stripe/checkout')

  if (isProtected && !loggedIn) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (
    loggedIn &&
    (pathname === '/auth/login' ||
      pathname === '/auth/register' ||
      pathname === '/auth/forgot-password')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
