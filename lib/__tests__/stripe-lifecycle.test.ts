/**
 * End-to-end subscription lifecycle, as seen by the Stripe webhook.
 *
 * Unlike stripe-webhook.test.ts (which asserts individual queries), this suite
 * keeps an in-memory `profiles` table and an in-memory Stripe subscription
 * store, runs the REAL webhook route + REAL syncCheckout, and checks the only
 * thing that matters to the customer: does assertActiveAccess() grant or deny
 * access after each event. See docs/RECETTE-STRIPE.md for the manual run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
type Sub = {
  id: string
  customer: string
  status: string
  cancel_at_period_end?: boolean
  metadata: Record<string, string>
  items: { data: { price: { id: string } }[] }
}

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  subs: new Map<string, unknown>(),
  failRead: 0,
  failWrite: 0,
  failStripe: 0,
  event: null as unknown,
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (_body: string, signature: string) => {
        if (signature !== 'valid-signature') throw new Error('bad signature')
        return state.event
      },
    },
    subscriptions: {
      retrieve: async (id: string) => {
        if (state.failStripe > 0) {
          state.failStripe--
          throw new Error('Stripe API unavailable')
        }
        const sub = state.subs.get(id)
        if (!sub) throw new Error(`No such subscription: ${id}`)
        return structuredClone(sub)
      },
    },
  },
  getPlanFromPriceId: (id: string) => (id === 'price_founder' ? 'starter' : null),
}))

// Minimal PostgREST-like fake honouring the filters the billing code uses.
vi.mock('@/lib/supabase/server', () => {
  const matches = (row: Row, filters: [string, unknown, 'eq' | 'is'][]) =>
    filters.every(([column, value, op]) =>
      op === 'is' ? row[column] === value : value !== null && row[column] === value,
    )
  const dbError = () => ({ message: 'connection reset', code: '08006' })
  const from = () => ({
    select: () => {
      const filters: [string, unknown, 'eq' | 'is'][] = []
      const read = () => {
        if (state.failRead > 0) {
          state.failRead--
          return { data: null, error: dbError() }
        }
        return { data: state.rows.filter((r) => matches(r, filters)), error: null }
      }
      const query = {
        eq: (column: string, value: unknown) => {
          filters.push([column, value, 'eq'])
          return query
        },
        maybeSingle: async () => {
          const { data, error } = read()
          if (error) return { data: null, error }
          if (data!.length > 1) return { data: null, error: { message: 'multiple rows' } }
          return { data: data![0] ? { ...data![0] } : null, error: null }
        },
        single: async () => {
          const { data, error } = read()
          if (error) return { data: null, error }
          if (data!.length !== 1) return { data: null, error: { message: 'not single' } }
          return { data: { ...data![0] }, error: null }
        },
      }
      return query
    },
    update: (patch: Row) => {
      const filters: [string, unknown, 'eq' | 'is'][] = []
      const run = () => {
        if (state.failWrite > 0) {
          state.failWrite--
          return { data: null, error: dbError() }
        }
        const hit = state.rows.filter((r) => matches(r, filters))
        hit.forEach((r) => Object.assign(r, patch))
        return { data: hit.map((r) => ({ id: r.id })), error: null }
      }
      const query = {
        eq: (column: string, value: unknown) => {
          filters.push([column, value, 'eq'])
          return query
        },
        is: (column: string, value: unknown) => {
          filters.push([column, value, 'is'])
          return query
        },
        select: () => ({
          single: async () => {
            const { data, error } = run()
            if (error) return { data: null, error }
            return data!.length === 1
              ? { data: data![0], error: null }
              : { data: null, error: { message: 'not single' } }
          },
        }),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(run()).then(({ error }) => ({ error })).then(resolve, reject),
      }
      return query
    },
  })
  return { createAdminClient: async () => ({ from }) }
})

import { POST } from '@/app/api/stripe/webhook/route'
import { assertActiveAccess, type Plan } from '@/lib/access-control'

const DAY = 86_400_000
const USER = 'user_1'
const CUSTOMER = 'cus_1'

const profile = () => state.rows.find((r) => r.id === USER)!
const access = () =>
  assertActiveAccess({
    plan: profile().plan as Plan,
    trial_ends_at: profile().trial_ends_at as string | null,
  })

function subscription(id: string, status: string, extra: Partial<Sub> = {}): Sub {
  const sub: Sub = {
    id,
    customer: CUSTOMER,
    status,
    metadata: { userId: USER },
    items: { data: [{ price: { id: 'price_founder' } }] },
    ...extra,
  }
  state.subs.set(id, sub)
  return sub
}
const setStatus = (id: string, status: string, extra: Partial<Sub> = {}) =>
  Object.assign(state.subs.get(id) as Sub, { status, ...extra })

const checkoutSession = (sub: string, extra: Row = {}) => ({
  id: `cs_${sub}`,
  mode: 'subscription',
  status: 'complete',
  payment_status: 'paid',
  metadata: { userId: USER },
  subscription: sub,
  customer: CUSTOMER,
  ...extra,
})
// Snapshot payloads are deliberately stale: the handler must re-read Stripe.
const renewalInvoice = (sub: string) => ({
  id: `in_${sub}`,
  parent: { subscription_details: { subscription: sub } },
})

async function deliver(type: string, object: unknown, signature = 'valid-signature') {
  state.event = { id: `evt_${type}`, type, data: { object } }
  const headers: Record<string, string> = signature ? { 'stripe-signature': signature } : {}
  return POST(
    new Request('https://encair.test/api/stripe/webhook', { method: 'POST', headers, body: '{}' }),
  )
}

let trialEnd: string

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'test-placeholder')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-placeholder')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-placeholder')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  state.subs.clear()
  state.failRead = state.failWrite = state.failStripe = 0
  // Signup (handle_new_user): free_trial, 30 days; checkout saved the customer.
  trialEnd = new Date(Date.now() + 30 * DAY).toISOString()
  state.rows = [
    {
      id: USER,
      plan: 'free_trial',
      trial_ends_at: trialEnd,
      stripe_customer_id: CUSTOMER,
      stripe_subscription_id: null,
    },
    // Another Encair account that must never be touched.
    {
      id: 'user_2',
      plan: 'starter',
      trial_ends_at: trialEnd,
      stripe_customer_id: 'cus_2',
      stripe_subscription_id: 'sub_2',
    },
  ]
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  expect(state.rows[1]).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_2' })
})

async function activate(id = 'sub_1') {
  subscription(id, 'active')
  expect((await deliver('checkout.session.completed', checkoutSession(id))).status).toBe(200)
  expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: id })
}

describe('Signup, trial and checkout', () => {
  it('grants the 30-day trial at signup and denies it once elapsed', () => {
    expect(access().ok).toBe(true)
    profile().trial_ends_at = new Date(Date.now() - 1000).toISOString()
    expect(access()).toMatchObject({ ok: false, status: 403 })
  })

  it('activates the paid plan on checkout.session.completed without touching trial_ends_at', async () => {
    await activate()
    expect(profile().trial_ends_at).toBe(trialEnd)
    expect(access().ok).toBe(true)
  })

  it('reactivates an account whose trial had already expired', async () => {
    profile().trial_ends_at = new Date(Date.now() - DAY).toISOString()
    expect(access().ok).toBe(false)
    await activate()
    expect(access().ok).toBe(true)
  })

  it('waits for a delayed payment, then activates on async_payment_succeeded', async () => {
    subscription('sub_1', 'incomplete')
    await deliver('checkout.session.completed', checkoutSession('sub_1', { payment_status: 'unpaid' }))
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null })
    setStatus('sub_1', 'active')
    await deliver('checkout.session.async_payment_succeeded', checkoutSession('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
  })

  it('activates from customer.subscription.created when it arrives before the checkout event', async () => {
    subscription('sub_1', 'active')
    await deliver('customer.subscription.created', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'))).status).toBe(200)
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
  })

  it('grants access while a Stripe-side trial is running (trialing)', async () => {
    subscription('sub_1', 'trialing')
    await deliver('customer.subscription.created', state.subs.get('sub_1'))
    expect(profile().plan).toBe('starter')
    expect(access().ok).toBe(true)
  })

  it('never grants access for an incomplete first payment (3DS abandoned) and keeps the app trial', async () => {
    subscription('sub_1', 'incomplete')
    await deliver('customer.subscription.created', state.subs.get('sub_1'))
    await deliver('invoice.payment_failed', renewalInvoice('sub_1'))
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null, trial_ends_at: trialEnd })
    setStatus('sub_1', 'incomplete_expired')
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    // The remaining app trial is not confiscated by an abandoned checkout.
    expect(profile()).toMatchObject({ plan: 'free_trial', trial_ends_at: trialEnd })
    expect(access().ok).toBe(true)
  })
})

describe('Renewal and failed payments', () => {
  it('keeps access on a successful renewal (invoice.paid)', async () => {
    await activate()
    expect((await deliver('invoice.paid', renewalInvoice('sub_1'))).status).toBe(200)
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
    expect(access().ok).toBe(true)
  })

  it('acknowledges invoice.payment_succeeded without writing (invoice.paid is the handled event)', async () => {
    await activate()
    const before = { ...profile() }
    expect((await deliver('invoice.payment_succeeded', renewalInvoice('sub_1'))).status).toBe(200)
    expect(profile()).toEqual(before)
  })

  it('keeps access while past_due (Stripe retry window = grace period, product decision)', async () => {
    await activate()
    setStatus('sub_1', 'past_due')
    await deliver('invoice.payment_failed', renewalInvoice('sub_1'))
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1', subscription_status: 'past_due' })
    expect(access().ok).toBe(true)
  })

  it('records the failed payment for the in-app warning, then clears it once the card works again', async () => {
    await activate()
    expect(profile().subscription_status).toBe('active')
    setStatus('sub_1', 'past_due')
    await deliver('invoice.payment_failed', renewalInvoice('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', subscription_status: 'past_due' })
    setStatus('sub_1', 'active')
    await deliver('invoice.paid', renewalInvoice('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', subscription_status: 'active' })
  })

  it('never flags a failed payment on a subscription that is not the recorded one', async () => {
    await activate()
    subscription('sub_other', 'past_due')
    await deliver('customer.subscription.updated', state.subs.get('sub_other'))
    expect(profile()).toMatchObject({ stripe_subscription_id: 'sub_1', subscription_status: 'active' })
  })

  it('revokes access when retries are exhausted and the subscription becomes unpaid, then restores it once paid', async () => {
    await activate()
    setStatus('sub_1', 'past_due')
    await deliver('invoice.payment_failed', renewalInvoice('sub_1'))
    setStatus('sub_1', 'unpaid')
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null, subscription_status: null })
    expect(access()).toMatchObject({ ok: false, status: 403 })

    // Customer updates the card in the portal and the open invoice is paid.
    setStatus('sub_1', 'active')
    await deliver('invoice.paid', renewalInvoice('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
    expect(access().ok).toBe(true)
  })

  it('revokes access when retries are exhausted and Stripe cancels the subscription', async () => {
    await activate()
    setStatus('sub_1', 'canceled')
    await deliver('customer.subscription.deleted', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null })
    expect(access().ok).toBe(false)
  })
})

describe('Cancellation, resumption and pause', () => {
  it('keeps access until period end, survives a resume, then revokes at deletion', async () => {
    await activate()
    setStatus('sub_1', 'active', { cancel_at_period_end: true })
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    expect(access().ok).toBe(true)

    setStatus('sub_1', 'active', { cancel_at_period_end: false })
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })

    setStatus('sub_1', 'active', { cancel_at_period_end: true })
    await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    setStatus('sub_1', 'canceled')
    await deliver('customer.subscription.deleted', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null })
    expect(Date.parse(profile().trial_ends_at as string)).toBeLessThanOrEqual(Date.now())
    expect(access()).toMatchObject({ ok: false, status: 403 })
  })

  it('lets a cancelled customer subscribe again with a new subscription', async () => {
    await activate('sub_old')
    setStatus('sub_old', 'canceled')
    await deliver('customer.subscription.deleted', state.subs.get('sub_old'))
    expect(access().ok).toBe(false)
    await activate('sub_new')
    expect(access().ok).toBe(true)
  })

  it('revokes on pause and restores on resume', async () => {
    await activate()
    setStatus('sub_1', 'paused')
    await deliver('customer.subscription.paused', state.subs.get('sub_1'))
    expect(access().ok).toBe(false)
    setStatus('sub_1', 'active')
    await deliver('customer.subscription.resumed', state.subs.get('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
    expect(access().ok).toBe(true)
  })
})

describe('Delivery guarantees', () => {
  it('ignores a late customer.subscription.updated delivered after deleted', async () => {
    await activate()
    const staleActivePayload = structuredClone(state.subs.get('sub_1'))
    setStatus('sub_1', 'canceled')
    await deliver('customer.subscription.deleted', state.subs.get('sub_1'))
    expect((await deliver('customer.subscription.updated', staleActivePayload)).status).toBe(200)
    expect((await deliver('invoice.paid', renewalInvoice('sub_1'))).status).toBe(200)
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'))).status).toBe(200)
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null })
    expect(access().ok).toBe(false)
  })

  it('is idempotent under duplicate delivery', async () => {
    await activate()
    await deliver('checkout.session.completed', checkoutSession('sub_1'))
    await deliver('invoice.paid', renewalInvoice('sub_1'))
    await deliver('invoice.paid', renewalInvoice('sub_1'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1', trial_ends_at: trialEnd })
    setStatus('sub_1', 'canceled')
    await deliver('customer.subscription.deleted', state.subs.get('sub_1'))
    const revokedAt = profile().trial_ends_at
    expect((await deliver('customer.subscription.deleted', state.subs.get('sub_1'))).status).toBe(200)
    expect(profile()).toMatchObject({ plan: 'free_trial', stripe_subscription_id: null, trial_ends_at: revokedAt })
  })

  it('does not let a stray second subscription revoke the active one', async () => {
    await activate()
    subscription('sub_stray', 'incomplete_expired')
    await deliver('customer.subscription.updated', state.subs.get('sub_stray'))
    subscription('sub_stray2', 'active')
    await deliver('customer.subscription.created', state.subs.get('sub_stray2'))
    expect(profile()).toMatchObject({ plan: 'starter', stripe_subscription_id: 'sub_1' })
  })

  it('acknowledges events for a customer unknown to Encair without writing', async () => {
    const before = structuredClone(state.rows)
    subscription('sub_x', 'active', { customer: 'cus_unknown', items: { data: [{ price: { id: 'price_other_product' } }] } })
    expect((await deliver('customer.subscription.updated', state.subs.get('sub_x'))).status).toBe(200)
    expect((await deliver('invoice.paid', renewalInvoice('sub_x'))).status).toBe(200)
    setStatus('sub_x', 'canceled')
    expect((await deliver('customer.subscription.deleted', state.subs.get('sub_x'))).status).toBe(200)
    expect((await deliver('checkout.session.completed', { id: 'cs_link', mode: 'subscription', metadata: {} })).status).toBe(200)
    expect(state.rows).toEqual(before)
  })

  it.each([
    ['missing', ''],
    ['invalid', 'forged-signature'],
  ])('rejects a %s signature with 400 and changes nothing', async (_label, signature) => {
    subscription('sub_1', 'active')
    const before = structuredClone(state.rows)
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'), signature)).status).toBe(400)
    expect(state.rows).toEqual(before)
  })

  it('answers 503 (retried by Stripe) when the webhook secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')
    subscription('sub_1', 'active')
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'))).status).toBe(503)
    expect(profile().plan).toBe('free_trial')
  })
})

describe('Transient failures are retried, never acknowledged', () => {
  it.each([
    ['database read', () => (state.failRead = 1)],
    ['database write', () => (state.failWrite = 1)],
    ['Stripe API', () => (state.failStripe = 1)],
  ])('returns 500 on a %s error during activation, then succeeds on retry', async (_label, fail) => {
    subscription('sub_1', 'active')
    fail()
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'))).status).toBe(500)
    expect(profile().plan).toBe('free_trial')
    expect((await deliver('checkout.session.completed', checkoutSession('sub_1'))).status).toBe(200)
    expect(profile().plan).toBe('starter')
  })

  it.each([
    ['database read', () => (state.failRead = 1)],
    ['database write', () => (state.failWrite = 1)],
    ['Stripe API', () => (state.failStripe = 1)],
  ])('returns 500 on a %s error during revocation, then revokes on retry', async (_label, fail) => {
    await activate()
    setStatus('sub_1', 'canceled')
    fail()
    expect((await deliver('customer.subscription.deleted', state.subs.get('sub_1'))).status).toBe(500)
    expect(profile().plan).toBe('starter')
    expect((await deliver('customer.subscription.deleted', state.subs.get('sub_1'))).status).toBe(200)
    expect(profile().plan).toBe('free_trial')
  })

  it.each(['subscription update', 'renewal'])('returns 500 on a database error during %s sync', async (kind) => {
    await activate()
    state.failWrite = 1
    const response =
      kind === 'renewal'
        ? await deliver('invoice.paid', renewalInvoice('sub_1'))
        : await deliver('customer.subscription.updated', state.subs.get('sub_1'))
    expect(response.status).toBe(500)
  })
})
