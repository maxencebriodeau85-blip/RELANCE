import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createCheckoutSession, changeSubscriptionPlan, STRIPE_PLANS, type PlanKey } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'
import type { Profile } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { plan } = body as { plan: PlanKey }

    if (plan !== 'starter') {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const configuredPrice = STRIPE_PLANS.starter.priceId
    if (!configuredPrice) return NextResponse.json({ error: 'Abonnement temporairement indisponible.' }, { status: 503 })
    const actualPrice = await (await import('@/lib/stripe')).stripe.prices.retrieve(configuredPrice)
    if (!actualPrice.active || actualPrice.unit_amount !== 1600 || actualPrice.currency !== 'eur' || actualPrice.recurring?.interval !== 'month' || actualPrice.recurring.interval_count !== 1) {
      return NextResponse.json({ error: 'Configuration du tarif à vérifier.' }, { status: 503 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null
    const appUrl = getAppUrl()

    // Already subscribed (Starter/Pro/Business switching plans): update the
    // EXISTING Stripe subscription's price instead of starting a second
    // checkout — see changeSubscriptionPlan for why. No new Checkout Session
    // is needed since a payment method is already on file.
    if (profile?.stripe_subscription_id) {
      await changeSubscriptionPlan({
        subscriptionId: profile.stripe_subscription_id,
        newPriceId: STRIPE_PLANS[plan].priceId,
      })
      return NextResponse.json({ url: `${appUrl}/dashboard/settings?checkout=success` })
    }

    const session = await createCheckoutSession({
      customerId: profile?.stripe_customer_id || undefined,
      priceId: STRIPE_PLANS[plan].priceId,
      successUrl: `${appUrl}/dashboard/settings?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?checkout=cancelled`,
      userId: user.id,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/dashboard/settings', request.url))
}
