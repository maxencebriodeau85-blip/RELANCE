import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route Handlers (unlike Server Components — see lib/supabase/server.ts) are
// allowed to mutate cookies, but the installed @supabase/ssr version (0.3.x
// per package.json) only ever calls the LEGACY get/set/remove cookie
// methods — it never calls getAll/setAll. Implementing only the newer API
// (an easy mistake, since @supabase/ssr's own docs lead with it) makes the
// client silently unable to read OR write cookies: session reads return
// nothing and signOut()/signIn() writes vanish, with no error. Both APIs are
// implemented here so this keeps working regardless of which method the
// installed version calls.
//
// Cookie mutations are collected and replayed explicitly onto the response
// object the route actually returns (e.g. NextResponse.redirect(...)) rather
// than relying on next/headers' cookies() auto-attachment merging onto a
// separately-constructed response.
export function createRouteHandlerClient(request: NextRequest) {
  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // v0.5.0+ API
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToApply.push(...cookiesToSet)
        },
        // v0.3.x API — what the currently installed @supabase/ssr version calls
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToApply.push({ name, value, options })
        },
        remove(name: string, options: CookieOptions) {
          cookiesToApply.push({ name, value: '', options })
        },
      },
    }
  )

  return {
    supabase,
    /** Cookie mutations collected so far — read-only, for callers that need
     *  to adjust them (e.g. stripping maxAge) before calling applyCookies(). */
    cookiesToApply,
    /** Replays every collected cookie mutation onto `response`, then returns it. */
    applyCookies<T extends NextResponse>(response: T): T {
      cookiesToApply.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    },
  }
}
