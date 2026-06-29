'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// During Next.js static prerender of client components, this module is
// evaluated on the server with `typeof window === 'undefined'`. Env vars
// may also be absent in some build phases. We return a no-op stub in that
// case so build-time prerendering does not crash. The real client is
// instantiated on the browser via React's lazy hooks (useEffect / useRef).
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

let _instance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_instance) return _instance

  if (!isBrowser()) {
    // Prerender stub — returned during SSR/SSG. Calling any method on it
    // throws, but a well-written client component should only touch
    // Supabase inside useEffect / handlers, never during render.
    return new Proxy({} as SupabaseClient, {
      get() {
        throw new Error('Supabase client used outside of the browser')
      },
    })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env var'
    )
  }

  _instance = createBrowserClient(url, key)
  return _instance
}
