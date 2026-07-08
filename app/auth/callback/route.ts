import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabaseAuthError } from '@/lib/auth-errors'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const { supabase, applyCookies } = createRouteHandlerClient(request)
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return applyCookies(NextResponse.redirect(`${origin}${next}`))
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(supabaseAuthError(error.message, error.status))}`
    )
  }

  if (code) {
    const { supabase, applyCookies } = createRouteHandlerClient(request)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return applyCookies(NextResponse.redirect(`${origin}${next}`))
    }
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(supabaseAuthError(error.message, error.status))}`
    )
  }

  // No recognisable token — the link may use the implicit flow where Supabase
  // puts tokens in the URL hash (#access_token=…). The hash is never sent to
  // the server so we forward to the client-side /auth/confirm page which can
  // read window.location.hash and call setSession() directly.
  return NextResponse.redirect(`${origin}/auth/confirm`)
}
