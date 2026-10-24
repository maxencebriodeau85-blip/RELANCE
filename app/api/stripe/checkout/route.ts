import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createCheckoutSession, createBillingPortalSession, stripe, STRIPE_PLANS, billingConfigured } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'
import { syncCheckout } from '@/lib/billing-sync'

export async function POST(request: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: 'Les abonnements ne sont pas encore ouverts. Votre compte et votre essai restent accessibles.' }, { status: 503 })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (body?.plan !== 'starter') return NextResponse.json({ error: 'Offre invalide.' }, { status: 400 })
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error || !profile) return NextResponse.json({ error: 'Votre profil est momentanément indisponible.' }, { status: 503 })
    const appUrl = getAppUrl()
    const priceId = STRIPE_PLANS.starter.priceId
    const price = await stripe.prices.retrieve(priceId)
    if (!price.active || price.unit_amount !== 1600 || price.currency !== 'eur' || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) {
      return NextResponse.json({ error: 'Le tarif est temporairement indisponible.' }, { status: 503 })
    }
    let customerId = profile.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } }, { idempotencyKey: `encair-customer-${user.id}` })
      const admin = await createAdminClient()
      const { error: saved } = await admin.from('profiles').update({ stripe_customer_id: customer.id } as never).eq('id', user.id).is('stripe_customer_id', null)
      if (saved) throw saved
      const { data: fresh, error: reread } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
      if (reread || !fresh?.stripe_customer_id) throw new Error('Client non enregistré')
      customerId = fresh.stripe_customer_id
    }
    // Always consult Stripe, including when the first webhook has not arrived.
    // Existing/past-due subscriptions go to the portal, never a second charge.
    const subscriptions = await stripe.subscriptions.list({ customer: customerId!, status: 'all', limit: 100 })
    const existing = subscriptions.data.find(item => !['canceled', 'incomplete_expired'].includes(item.status))
    if (existing) {
      const portal = await createBillingPortalSession({ customerId: customerId!, returnUrl: `${appUrl}/subscription` })
      return NextResponse.json({ url: portal.url })
    }
    const sessions = await stripe.checkout.sessions.list({ customer: customerId!, limit: 100 })
    const relevant = sessions.data.filter(item => item.mode === 'subscription' && item.metadata?.userId === user.id)
    const open = relevant.find(item => item.status === 'open' && item.url)
    if (open) return NextResponse.json({ url: open.url })
    // A completed checkout may precede its webhook. Sync it before offering another.
    const latest = relevant[0]
    if (latest?.status === 'complete' && await syncCheckout(latest, user.id)) return NextResponse.json({ url: `${appUrl}/dashboard` })
    const session = await createCheckoutSession({
      customerId: customerId!, priceId, userId: user.id,
      successUrl: `${appUrl}/subscription/return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/subscription?checkout=cancelled`,
      // Concurrent attempts see the same predecessor and receive the same session.
      idempotencyKey: `encair-checkout-${user.id}-${priceId}-${latest?.id || 'first'}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout failed', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: 'Le paiement est momentanément indisponible. Réessayez dans un instant.' }, { status: 503 })
  }
}
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/subscription', request.url))
}
