import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  configured: vi.fn(), create: vi.fn(), portal: vi.fn(), subscriptions: vi.fn(), sessions: vi.fn(), price: vi.fn(), sync: vi.fn(), profile: vi.fn(), user: vi.fn(),
}))
vi.mock('@/lib/stripe', () => ({ billingConfigured: mocks.configured, STRIPE_PLANS: { starter: { priceId: 'price_founder' } }, createCheckoutSession: mocks.create, createBillingPortalSession: mocks.portal,
  stripe: { prices: { retrieve: mocks.price }, subscriptions: { list: mocks.subscriptions }, checkout: { sessions: { list: mocks.sessions } } },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.user }, from: () => ({ select: () => ({ eq: () => ({ single: mocks.profile }) }) }) }), createAdminClient: vi.fn() }))
vi.mock('@/lib/billing-sync', () => ({ syncCheckout: mocks.sync }))
import { POST } from '../../app/api/stripe/checkout/route'
const request = () => new Request('https://encair.test/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ plan: 'starter' }) })
beforeEach(() => {
  vi.resetAllMocks(); mocks.configured.mockReturnValue(true)
  mocks.user.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } } })
  mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_1' }, error: null })
  mocks.price.mockResolvedValue({ active: true, unit_amount: 1600, currency: 'eur', recurring: { interval: 'month', interval_count: 1 } })
  mocks.subscriptions.mockResolvedValue({ data: [], has_more: false }); mocks.sessions.mockResolvedValue({ data: [], has_more: false })
  mocks.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' }); mocks.portal.mockResolvedValue({ url: 'https://billing.stripe.com/test' })
})
describe('Checkout safety and recovery', () => {
  it('does not create checkout when an older active subscription may be outside the first 100 results', async () => {
    const history = [...Array.from({ length: 100 }, (_, index) => ({ id: `sub_canceled_${index}`, status: 'canceled' })), { id: 'sub_older_active', status: 'active' }]
    mocks.subscriptions.mockResolvedValue({ data: history.slice(0, 100), has_more: history.length > 100 })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sessions).not.toHaveBeenCalled()
  })
  it('does not create checkout when an older open session may be outside the first 100 results', async () => {
    const history = [...Array.from({ length: 100 }, (_, index) => ({ id: `cs_expired_${index}`, mode: 'subscription', metadata: { userId: 'u1' }, status: 'expired' })), { id: 'cs_older_open', mode: 'subscription', metadata: { userId: 'u1' }, status: 'open', url: 'https://checkout.stripe.com/older' }]
    mocks.sessions.mockResolvedValue({ data: history.slice(0, 100), has_more: history.length > 100 })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each(['subscriptions', 'sessions'] as const)('requires explicit history completeness from %s before creation', async resource => {
    mocks[resource].mockResolvedValue({ data: [] })
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await response.json()).error).toContain('historique de facturation')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('allows a new checkout when both full 100-item pages are explicitly complete', async () => {
    mocks.subscriptions.mockResolvedValue({ data: Array.from({ length: 100 }, (_, index) => ({ id: `sub_${index}`, status: 'canceled' })), has_more: false })
    mocks.sessions.mockResolvedValue({ data: Array.from({ length: 100 }, (_, index) => ({ id: `cs_${index}`, mode: 'subscription', metadata: { userId: 'u1' }, status: 'expired' })), has_more: false })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(mocks.create.mock.calls[0][0].idempotencyKey).toBe('encair-checkout-u1-price_founder-cs_0-now')
  })
  it('still syncs a completed checkout before offering another when history is complete', async () => {
    const session = { id: 'cs_complete', mode: 'subscription', metadata: { userId: 'u1' }, status: 'complete' }
    mocks.sessions.mockResolvedValue({ data: [session], has_more: false })
    mocks.sync.mockResolvedValue(true)
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).url).toContain('/dashboard')
    expect(mocks.sync).toHaveBeenCalledWith(session, 'u1')
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it.each(['subscriptions', 'sessions'] as const)('does not create checkout when %s cannot be read', async resource => {
    mocks[resource].mockRejectedValue(new Error('simulated outage'))
    expect((await POST(request())).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('does not crash when billing is not configured', async () => {
    mocks.configured.mockReturnValue(false)
    expect((await POST(request())).status).toBe(503); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('blocks unknown users and missing profiles', async () => {
    mocks.user.mockResolvedValueOnce({ data: { user: null } }); expect((await POST(request())).status).toBe(401)
    mocks.profile.mockResolvedValueOnce({ data: null, error: {} }); expect((await POST(request())).status).toBe(503)
  })
  it('refuses the wrong Stripe price', async () => {
    mocks.price.mockResolvedValueOnce({ active: true, unit_amount: 2900 }); expect((await POST(request())).status).toBe(503)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('routes an existing past-due subscription to the portal instead of charging again', async () => {
    mocks.subscriptions.mockResolvedValue({ data: [{ status: 'past_due' }], has_more: true })
    expect((await (await POST(request())).json()).url).toContain('billing.stripe.com'); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('reuses the open payment session', async () => {
    mocks.sessions.mockResolvedValue({ data: [{ mode: 'subscription', metadata: { userId: 'u1' }, status: 'open', url: 'https://checkout.stripe.com/existing' }], has_more: true })
    expect((await (await POST(request())).json()).url).toContain('existing'); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('shares an idempotency key across concurrent attempts and uses an accessible cancellation page', async () => {
    await Promise.all([POST(request()), POST(request())])
    const first = mocks.create.mock.calls[0][0], second = mocks.create.mock.calls[1][0]
    expect(first.idempotencyKey).toBe(second.idempotencyKey)
    expect(first.cancelUrl).toContain('/subscription?checkout=cancelled')
    expect(first.successUrl).toContain('/subscription/return?session_id={CHECKOUT_SESSION_ID}')
  })
  it('carries the remaining Encair trial over: first charge at its end, not today', async () => {
    const end = new Date(Date.now() + 10 * 86_400_000).toISOString()
    mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_1', plan: 'free_trial', trial_ends_at: end }, error: null })
    expect((await POST(request())).status).toBe(200)
    const args = mocks.create.mock.calls[0][0]
    expect(args.trialEnd).toBe(Math.floor(Date.parse(end) / 1000))
    expect(args.idempotencyKey).toBe(`encair-checkout-u1-price_founder-first-${args.trialEnd}`)
  })
  it('charges immediately when the trial is over or ends within 49 hours', async () => {
    for (const trial_ends_at of [new Date(Date.now() - 86_400_000).toISOString(), new Date(Date.now() + 40 * 3_600_000).toISOString()]) {
      mocks.create.mockClear()
      mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_1', plan: 'free_trial', trial_ends_at }, error: null })
      expect((await POST(request())).status).toBe(200)
      expect(mocks.create.mock.calls[0][0].trialEnd).toBeNull()
    }
  })
})
