import type Stripe from 'stripe'
import { createAdminClient } from './supabase/server'
import { getPlanFromPriceId, stripe } from './stripe'

/** Re-fetch current Stripe state; never grant access from a success query string. */
export async function syncCheckout(session: Stripe.Checkout.Session, expectedUserId?: string) {
  const userId = session.metadata?.userId
  if (session.mode !== 'subscription' || !userId || (expectedUserId && userId !== expectedUserId)) throw new Error('Session non autorisée.')
  if (session.status !== 'complete' || !session.subscription || !session.customer) return false
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  if (subscription.customer !== customerId || subscription.metadata.userId !== userId) throw new Error('Le titulaire de l’abonnement ne correspond pas.')
  if (!['active', 'trialing'].includes(subscription.status)) return false
  const plan = getPlanFromPriceId(subscription.items.data[0]?.price.id)
  if (!plan) throw new Error('Tarif Stripe non reconnu.')
  const db = await createAdminClient()
  const { data: profile, error: readError } = await db.from('profiles').select('stripe_customer_id, stripe_subscription_id').eq('id', userId).single()
  if (readError || !profile) throw new Error('Profil indisponible.')
  if (profile.stripe_customer_id && profile.stripe_customer_id !== customerId) throw new Error('Client Stripe non reconnu.')
  if (profile.stripe_subscription_id && profile.stripe_subscription_id !== subscriptionId) {
    const previous = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
    if (!['canceled', 'incomplete_expired'].includes(previous.status)) throw new Error('Un abonnement existe déjà pour ce compte.')
  }
  const { data, error } = await db.from('profiles').update({ plan, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId } as never).eq('id', userId).select('id').single()
  if (error || !data) throw new Error('Activation impossible. Réessayez.')
  return true
}
