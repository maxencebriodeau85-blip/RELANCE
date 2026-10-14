import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Replay SSR cookie mutations onto the returned response.
export function createRouteHandlerClient(request: NextRequest) {
  const cookiesToApply: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
      cookies: {
        // v0.5.0+ API
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToApply.push(...cookiesToSet)
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
