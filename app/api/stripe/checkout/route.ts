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

    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
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
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan') as PlanKey

  if (!plan || !STRIPE_PLANS[plan]) {
    return NextResponse.redirect(new URL('/#pricing', request.url))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL(`/auth/login?redirectedFrom=/api/stripe/checkout?plan=${plan}`, request.url)
      )
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null
    const appUrl = getAppUrl()

    // Already subscribed: switch the price on the EXISTING subscription
    // instead of creating a second one alongside it (see changeSubscriptionPlan).
    if (profile?.stripe_subscription_id) {
      await changeSubscriptionPlan({
        subscriptionId: profile.stripe_subscription_id,
        newPriceId: STRIPE_PLANS[plan].priceId,
      })
      return NextResponse.redirect(new URL('/dashboard/settings?checkout=success', request.url))
    }

    const session = await createCheckoutSession({
      customerId: profile?.stripe_customer_id || undefined,
      priceId: STRIPE_PLANS[plan].priceId,
      successUrl: `${appUrl}/dashboard/settings?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/settings?checkout=cancelled`,
      userId: user.id,
    })

    return NextResponse.redirect(session.url!)
  } catch (err) {
    console.error('Checkout redirect error:', err)
    return NextResponse.redirect(new URL('/#pricing', request.url))
  }
}
