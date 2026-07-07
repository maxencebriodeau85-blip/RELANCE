import { describe, it, expect, beforeAll } from 'vitest'

// lib/stripe.ts instantiates the Stripe SDK at module load time, which
// requires STRIPE_SECRET_KEY to be set (any non-empty string works — the SDK
// doesn't validate the key format or reach the network until an API call is
// made). Set dummy env vars before importing so this module-level side
// effect doesn't crash the test run.
beforeAll(() => {
  process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy'
  process.env.STRIPE_STARTER_PRICE_ID ??= 'price_starter_test'
  process.env.STRIPE_PRO_PRICE_ID ??= 'price_pro_test'
  process.env.STRIPE_BUSINESS_PRICE_ID ??= 'price_business_test'
})

describe('getPlanFromPriceId', () => {
  // Regression test for a real bug: the webhook handler used to fall back to
  // 'starter' whenever a price ID didn't match — silently downgrading a
  // paying Pro/Business customer to the cheapest tier's limits the moment
  // STRIPE_*_PRICE_ID drifts from what's configured in Stripe (a typo, a
  // live/test mode mismatch, a rotated price ID). This pins the contract the
  // webhook now relies on: unmatched price IDs must resolve to `null`, never
  // to a guessed plan — the caller is responsible for not silently
  // defaulting a paying customer's plan.
  it('never guesses a plan for an unrecognized price ID', async () => {
    const { getPlanFromPriceId } = await import('../stripe')
    expect(getPlanFromPriceId('price_does_not_exist')).toBeNull()
  })

  it('resolves each configured price ID back to its plan key', async () => {
    const { getPlanFromPriceId } = await import('../stripe')
    expect(getPlanFromPriceId(process.env.STRIPE_STARTER_PRICE_ID!)).toBe('starter')
    expect(getPlanFromPriceId(process.env.STRIPE_PRO_PRICE_ID!)).toBe('pro')
    expect(getPlanFromPriceId(process.env.STRIPE_BUSINESS_PRICE_ID!)).toBe('business')
  })
})
