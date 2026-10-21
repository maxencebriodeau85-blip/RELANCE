/** Explicit setup only. Does not modify existing subscriptions or env files. */
import Stripe from 'stripe'
import { OFFER } from '../lib/plans'
async function main() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error('STRIPE_SECRET_KEY requis')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-09-30.endive',
  })
  const lookup = 'encair_founder_monthly_16_eur_v1'
  const existing = await stripe.prices.list({
    lookup_keys: [lookup],
    active: true,
    limit: 1,
  })
  if (existing.data[0]) {
    console.log(`STRIPE_FOUNDER_PRICE_ID=${existing.data[0].id}`)
    return
  }
  const product = await stripe.products.create(
    { name: `Encair ${OFFER.name}`, metadata: { plan_key: OFFER.key } },
    { idempotencyKey: `${lookup}_product` },
  )
  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: OFFER.price * 100,
      currency: 'eur',
      recurring: { interval: 'month' },
      tax_behavior: 'exclusive',
      lookup_key: lookup,
      metadata: { plan_key: OFFER.key },
    },
    { idempotencyKey: `${lookup}_price` },
  )
  console.log(`STRIPE_FOUNDER_PRICE_ID=${price.id}`)
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
