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

const CANONICAL_HOST = 'relanceflow.fr'

function hasSessionCookie(request: NextRequest): boolean {
  // @supabase/ssr stores the session in a cookie named:
  //   sb-<project-ref>-auth-token          (small JWTs)
  //   sb-<project-ref>-auth-token.0/.1/…  (chunked large JWTs)
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
}

export function middleware(request: NextRequest) {
  const { pathname, hostname, protocol, search } = request.nextUrl

  // ── Canonical host enforcement ────────────────────────────────────────────
  // The site has one production domain. Any other hostname (legacy Vercel
  // aliases like `relance-teal.vercel.app`, preview deployments, future
  // typo subdomains) is 301-redirected to the canonical domain.
  //
  // Two safety nets:
  //   - never redirect from localhost or *.local (dev)
  //   - never redirect webhook routes (Stripe/Resend hit specific URLs)
  //   - never redirect /api/health (uptime monitors hit any host)
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  const isWebhook =
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/health')

  if (!isLocalHost && !isWebhook && hostname !== CANONICAL_HOST) {
    const canonical = new URL(`https://${CANONICAL_HOST}${pathname}${search}`)
    return NextResponse.redirect(canonical, 301)
  }

  // ── Auth redirects (only run when host is already canonical) ─────────────
  const loggedIn = hasSessionCookie(request)

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

  // Mark non-production responses noindex at the header level so that
  // even if a Vercel preview URL leaks (despite the canonical redirect
  // above), Google won't index it. This is a belt-and-suspenders fix
  // on top of the 301 — `VERCEL_ENV` is `production` only on the prod
  // deployment, `preview` on PRs, `development` locally.
  const response = NextResponse.next()
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  // Reference unused vars to satisfy strict TS without weakening the tuple destructure
  void protocol
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
