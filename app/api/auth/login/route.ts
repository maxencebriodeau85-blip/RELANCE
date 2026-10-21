import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAuthError } from '@/lib/auth-errors'
import { safeRedirect } from '@/lib/auth-navigation'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST(request: NextRequest) {
  const json = request.headers.get('content-type')?.includes('application/json')
  let redirectTo = '/dashboard'
  const failure = (message: string, status = 400) => {
    if (json) return NextResponse.json({ error: message }, { status })
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('error', message)
    url.searchParams.set('redirectedFrom', redirectTo)
    return NextResponse.redirect(url, 303)
  }
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return failure('Requête non autorisée.', 403)
  try {
    const body = json ? await request.json() : Object.fromEntries(await request.formData())
    redirectTo = safeRedirect(body.redirectTo)
    const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).safeParse(body)
    if (!parsed.success) return failure('Vérifiez votre email et votre mot de passe.')
    const { supabase, applyCookies } = createRouteHandlerClient(request)
    const { error } = await supabase.auth.signInWithPassword(parsed.data)
    if (error) return applyCookies(failure(supabaseAuthError(error.message, error.status), error.status === 429 ? 429 : 401))
    return applyCookies(json
      ? NextResponse.json({ redirectTo }, { headers: { 'Cache-Control': 'no-store' } })
      : NextResponse.redirect(new URL(redirectTo, request.url), 303))
  } catch {
    return failure('Le service de connexion ne répond pas. Réessayez dans un instant.', 503)
  }
}
