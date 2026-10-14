import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safeRedirect } from '@/lib/auth-navigation'
import { createBillingPortalSession, billingConfigured } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'
import type { Profile } from '@/lib/database.types'

export async function POST(request: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: 'La gestion des abonnements est momentanément indisponible.' }, { status: 503 })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Always fetch customerId from the DB — never trust client-supplied IDs.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as Pick<Profile, 'stripe_customer_id'> | null
    const customerId = profile?.stripe_customer_id

    if (!customerId) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe trouvé' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const appUrl = getAppUrl()
    const returnUrl = `${appUrl}${safeRedirect(body.returnUrl, '/subscription')}`

    const session = await createBillingPortalSession({ customerId, returnUrl })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création du portail' }, { status: 500 })
  }
}
