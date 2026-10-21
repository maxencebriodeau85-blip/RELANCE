import Stripe from 'stripe'
import { OFFER } from './plans'

let instance: Stripe | undefined
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error('Stripe n’est pas configuré.')
  return (instance ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-09-30.endive',
    typescript: true,
    timeout: 15000,
    maxNetworkRetries: 1,
  }))
}
// Lazy access keeps public pages and free accounts independent of Stripe setup.
export const stripe = new Proxy({} as Stripe, {
  get: (_target, property) => Reflect.get(getStripe(), property),
})
export function billingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_FOUNDER_PRICE_ID &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

// Source of truth for plans — must stay in sync with:
//   - components/landing/pricing-section.tsx (landing display)
//   - app/dashboard/settings/page.tsx (in-app upgrade UI)
//   - app/layout.tsx JSON-LD offers
//   - lib/metrics.ts PLAN_LIMITS
export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.STRIPE_FOUNDER_PRICE_ID!,
    name: OFFER.name,
    price: OFFER.price,
    invoiceLimit: OFFER.invoiceLimit,
    features: OFFER.features,
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: 'Pro',
    price: 49,
    invoiceLimit: 200,
    features: [
      "Jusqu'à 200 factures/mois",
      'Tout Starter +',
      'Scénarios de relance personnalisables',
      'Mise en demeure PDF (art. 1344 C.civ.)',
      'Export CSV & statistiques avancées',
      'Import CSV en masse',
      'Support prioritaire',
    ],
  },
  business: {
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID!,
    name: 'Business',
    price: 99,
    invoiceLimit: 1000,
    features: [
      "Jusqu'à 1000 factures/mois",
      'Tout Pro +',
      'API & webhooks',
      'Multi-utilisateurs',
      'Intégration Pennylane',
      'Account manager dédié',
      'SLA 99,9 %',
    ],
  },
} as const

export type PlanKey = keyof typeof STRIPE_PLANS

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
  idempotencyKey,
}: {
  customerId?: string
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
  idempotencyKey?: string
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    integration_identifier: 'encair_founder_qmvkpzrt',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      // No Stripe trial here: the 30-day free trial is already granted at
      // signup (profiles.trial_ends_at). Adding trial_period_days would give
      // a SECOND free month billed by Stripe — double trial = revenue leak.
      metadata: { userId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    locale: 'fr',
  }

  if (customerId) {
    sessionParams.customer = customerId
  }

  return stripe.checkout.sessions.create(
    sessionParams,
    idempotencyKey ? { idempotencyKey } : undefined,
  )
}

// Changes the price on an EXISTING subscription (upgrade/downgrade) instead
// of starting a second one. Without this, switching plans from the settings
// page would call createCheckoutSession again — Stripe would happily create
// a brand-new subscription alongside the old one, silently double-billing
// the customer (both subscriptions active, both charging their card) since
// nothing ever cancels the original. Stripe prorates the difference
// automatically via 'create_prorations'.
export async function changeSubscriptionPlan({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string
  newPriceId: string
}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const itemId = subscription.items.data[0]?.id
  if (!itemId) {
    throw new Error(`Subscription ${subscriptionId} has no line item to update`)
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'create_prorations',
  })
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export function getPlanFromPriceId(priceId: string): PlanKey | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.priceId === priceId) {
      return key as PlanKey
    }
  }
  return null
}
