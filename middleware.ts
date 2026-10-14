import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Refresh sessions in a writable response, with bounded network time.
// Only an explicitly configured, owned domain may receive redirects.
const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
let canonicalHost: string | null = null
try {
  const url = new URL(configuredUrl || '')
  if (url.protocol === 'https:' && !/(^|\.)relanceflow\.fr$/.test(url.hostname)) canonicalHost = url.hostname
} catch { /* Domain not configured yet. */ }

function hasSessionCookie(request: NextRequest): boolean {
  // @supabase/ssr stores the session in a cookie named:
  //   sb-<project-ref>-auth-token          (small JWTs)
  //   sb-<project-ref>-auth-token.0/.1/…  (chunked large JWTs)
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname, hostname, protocol, search } = request.nextUrl

  // ── Canonical host enforcement ────────────────────────────────────────────
  // When the production domain is live, every non-canonical hostname (legacy
  // Vercel aliases like `relance-teal.vercel.app`, preview deployments,
  // typo subdomains) is 301-redirected to the canonical domain.
  //
  // GATING: enable only when ENFORCE_CANONICAL_HOST=true. Without this flag,
  // the Vercel preview / production URL is reachable directly — which is
  // essential while the .fr domain has not been purchased / DNS-pointed yet.
  // Once the domain is live in Vercel, set ENFORCE_CANONICAL_HOST=true in
  // the production env to enable the redirect.
  //
  // Safety nets:
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

  const enforceCanonical = process.env.ENFORCE_CANONICAL_HOST === 'true'
  if (enforceCanonical && canonicalHost && process.env.VERCEL_ENV !== 'preview' && !isLocalHost && !isWebhook && hostname !== canonicalHost) {
    const canonical = new URL(`https://${canonicalHost}${pathname}${search}`)
    return NextResponse.redirect(canonical, 301)
  }

  // ── Auth redirects (only run when host is already canonical) ─────────────
  const loggedIn = hasSessionCookie(request)

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/invoices') ||
    pathname.startsWith('/api/contacts') ||
    pathname.startsWith('/api/notifications') ||
    pathname.startsWith('/api/stripe/checkout') ||
    pathname.startsWith('/subscription')

  let response = NextResponse.next()
  if (isProtected && !loggedIn) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 })
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('redirectedFrom', pathname + search)
    return NextResponse.redirect(url)
  }
  if (loggedIn && (isProtected || pathname.startsWith('/api/profile') || pathname === '/api/stripe/portal')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && key) {
      const supabase = createServerClient(supabaseUrl, key, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(values) {
            values.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      })
      // Authorization stays in server handlers. A transient outage must not
      // erase a valid browser session or redirect an API call to an HTML form.
      try { await supabase.auth.getUser() } catch { /* Handler reports the outage. */ }
    }
  }

  // Mark non-production responses noindex at the header level so that
  // even if a Vercel preview URL leaks (despite the canonical redirect
  // above), Google won't index it. This is a belt-and-suspenders fix
  // on top of the 301 — `VERCEL_ENV` is `production` only on the prod
  // deployment, `preview` on PRs, `development` locally.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  if (pathname.startsWith('/auth') || pathname.startsWith('/subscription') || pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
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
