import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAuthError } from '@/lib/auth-errors'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  // Accept both JSON (legacy) and form-encoded (native form submit)
  const contentType = request.headers.get('content-type') ?? ''
  let email: string
  let password: string
  let redirectTo: string

  let rememberMe = true // default: persist session

  if (contentType.includes('application/json')) {
    const body = await request.json()
    email = (body.email as string)?.trim()
    password = body.password as string
    redirectTo = (body.redirectTo as string) || '/dashboard'
    rememberMe = body.rememberMe !== false
  } else {
    const form = await request.formData()
    email = ((form.get('email') as string) ?? '').trim()
    password = (form.get('password') as string) ?? ''
    redirectTo = (form.get('redirectTo') as string) || '/dashboard'
    // Unchecked checkboxes are absent from form data
    rememberMe = form.get('rememberMe') === 'on'
  }

  // Prevent open redirect — same-origin absolute paths only, no
  // protocol-relative (//evil.com) nor backslash tricks (/\evil.com).
  if (!/^\/[^/\\]/.test(redirectTo)) {
    redirectTo = '/dashboard'
  }

  if (!email || !password) {
    return loginError(request, 'Veuillez remplir tous les champs.', redirectTo)
  }

  const { supabase, cookiesToApply, applyCookies } = createRouteHandlerClient(request)

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return loginError(request, supabaseAuthError(error.message, error.status), redirectTo)
  }

  // Return a 303 redirect with the session cookies explicitly attached.
  // The browser is guaranteed by the HTTP spec to process Set-Cookie headers
  // before following the redirect, so the next request to /dashboard will
  // carry a valid session and the middleware will let it through.
  if (!rememberMe) {
    // Strip maxAge so the cookie is a session cookie that expires when the
    // browser closes, instead of persisting past this browser session.
    cookiesToApply.forEach((c) => {
      c.options = { ...c.options, maxAge: undefined }
    })
  }
  const response = NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 })
  return applyCookies(response)
}

function loginError(request: NextRequest, message: string, redirectTo: string) {
  const url = new URL('/auth/login', request.url)
  url.searchParams.set('error', message)
  if (redirectTo !== '/dashboard') url.searchParams.set('redirectedFrom', redirectTo)
  return NextResponse.redirect(url, { status: 303 })
}
