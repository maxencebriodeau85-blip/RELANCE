import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    name: 'Starter',
    price: 19,
    invoiceLimit: 30,
    features: [
      "Jusqu'à 30 factures/mois",
      '3 modèles de relance',
      'Relances email automatiques',
      'Tableau de bord DSO',
      'Support par email',
    ],
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: 'Pro',
    price: 49,
    invoiceLimit: 200,
    features: [
      "Jusqu'à 200 factures/mois",
      'Scénarios personnalisables',
      "Générateur de mise en demeure (PDF)",
      'Import CSV en masse',
      'Statistiques avancées',
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
      'API access',
      'Multi-utilisateurs',
      'Intégration comptable (Pennylane)',
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
