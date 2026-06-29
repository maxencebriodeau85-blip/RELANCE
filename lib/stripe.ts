import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    name: 'Solo',
    price: 15,
    invoiceLimit: 500,
    features: [
      'Pipeline kanban (contacts illimités)',
      'Journal d\'activité',
      'Séquences relance prospects auto',
      'Création de factures',
      'Relances factures auto',
      'Dashboard commercial',
      'Support email',
    ],
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: 'Pro',
    price: 29,
    invoiceLimit: 500,
    features: [
      'Tout Solo, plus :',
      'Intégrations comptables',
      'Export comptable CSV',
      'Scénarios personnalisables',
      'Support prioritaire',
    ],
  },
  business: {
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID!,
    name: 'Business',
    price: 49,
    invoiceLimit: -1,
    features: [
      'Tout Pro, plus :',
      'API & webhooks',
      'Multi-utilisateurs',
      'Account manager dédié',
      'SLA 99.9%',
    ],
  },
}

export type PlanKey = keyof typeof STRIPE_PLANS

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId?: string
  priceId: string
  successUrl: string
  cancelUrl: string
  userId: string
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      trial_period_days: 30,
      metadata: { userId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    locale: 'fr',
  }

  if (customerId) {
    sessionParams.customer = customerId
  }

  return stripe.checkout.sessions.create(sessionParams)
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
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.priceId === priceId) {
      return key as PlanKey
    }
  }
  return null
}
