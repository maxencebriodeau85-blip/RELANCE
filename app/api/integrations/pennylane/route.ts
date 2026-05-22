// GET /api/integrations/pennylane — initiate OAuth flow
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPennylaneAuthUrl } from '@/lib/integrations/pennylane'
import { generateWebhookSecret } from '@/lib/crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (!process.env.PENNYLANE_CLIENT_ID) {
    return NextResponse.json({ error: 'Intégration Pennylane non configurée' }, { status: 503 })
  }

  // State = base64(userId:randomSecret) — verified in callback
  const state = Buffer.from(`${user.id}:${generateWebhookSecret()}`).toString('base64url')

  // Store state temporarily in a short-lived cookie
  const response = NextResponse.redirect(getPennylaneAuthUrl(state))
  response.cookies.set('pennylane_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  return response
}
