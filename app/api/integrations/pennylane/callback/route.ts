// GET /api/integrations/pennylane/callback — OAuth callback
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/integrations/pennylane'
import { encrypt } from '@/lib/crypto'
import { cookies } from 'next/headers'
import { getAppUrl } from '@/lib/app-url'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = getAppUrl()

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=pennylane_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=pennylane_invalid`)
  }

  // Verify state cookie
  const cookieStore = await cookies()
  const savedState = cookieStore.get('pennylane_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=pennylane_state_mismatch`)
  }

  // Extract userId from state
  const decoded = Buffer.from(state, 'base64url').toString()
  const userId = decoded.split(':')[0]

  try {
    const token = await exchangeCode(code)

    const [encAccessToken, encRefreshToken] = await Promise.all([
      encrypt(token.access_token),
      encrypt(token.refresh_token || ''),
    ])

    const supabase = await createClient()

    // Upsert integration record
    const { error: dbError } = await supabase.from('integrations').upsert({
      user_id:          userId,
      provider:         'pennylane',
      status:           'active',
      access_token:     encAccessToken,
      refresh_token:    encRefreshToken,
      token_expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
      config:           {},
    } as never, { onConflict: 'user_id,provider' })

    if (dbError) throw dbError

    // Clear state cookie
    const response = NextResponse.redirect(`${appUrl}/dashboard/integrations?connected=pennylane`)
    response.cookies.delete('pennylane_oauth_state')

    // Trigger background sync
    await fetch(`${appUrl}/api/integrations/pennylane/sync`, {
      method: 'POST',
      headers: { 'x-user-id': userId, 'x-internal': process.env.CRON_SECRET || '' },
    }).catch(() => null) // fire-and-forget

    return response
  } catch (err) {
    console.error('Pennylane callback error:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=pennylane_token`)
  }
}
