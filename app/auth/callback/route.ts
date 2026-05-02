import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Creates a Supabase client that collects cookie mutations into an array
// so they can be explicitly attached to any response object.
function makeClient(
  request: NextRequest,
  collector: { name: string; value: string; options: CookieOptions }[]
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
          collector.push(...cookies)
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const cookies: { name: string; value: string; options: CookieOptions }[] = []
    const supabase = makeClient(request, cookies)
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    )
  }

  if (code) {
    const cookies: { name: string; value: string; options: CookieOptions }[] = []
    const supabase = makeClient(request, cookies)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // No recognisable token — the link may use the implicit flow where Supabase
  // puts tokens in the URL hash (#access_token=…). The hash is never sent to
  // the server so we forward to the client-side /auth/confirm page which can
  // read window.location.hash and call setSession() directly.
  return NextResponse.redirect(`${origin}/auth/confirm`)
}
