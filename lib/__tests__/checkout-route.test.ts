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
  vi.clearAllMocks(); mocks.configured.mockReturnValue(true)
  mocks.user.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } } })
  mocks.profile.mockResolvedValue({ data: { stripe_customer_id: 'cus_1' }, error: null })
  mocks.price.mockResolvedValue({ active: true, unit_amount: 1600, currency: 'eur', recurring: { interval: 'month', interval_count: 1 } })
  mocks.subscriptions.mockResolvedValue({ data: [] }); mocks.sessions.mockResolvedValue({ data: [] })
  mocks.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' }); mocks.portal.mockResolvedValue({ url: 'https://billing.stripe.com/test' })
})
describe('Checkout safety and recovery', () => {
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
    mocks.subscriptions.mockResolvedValue({ data: [{ status: 'past_due' }] })
    expect((await (await POST(request())).json()).url).toContain('billing.stripe.com'); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('reuses the open payment session', async () => {
    mocks.sessions.mockResolvedValue({ data: [{ mode: 'subscription', metadata: { userId: 'u1' }, status: 'open', url: 'https://checkout.stripe.com/existing' }] })
    expect((await (await POST(request())).json()).url).toContain('existing'); expect(mocks.create).not.toHaveBeenCalled()
  })
  it('shares an idempotency key across concurrent attempts and uses an accessible cancellation page', async () => {
    await Promise.all([POST(request()), POST(request())])
    const first = mocks.create.mock.calls[0][0], second = mocks.create.mock.calls[1][0]
    expect(first.idempotencyKey).toBe(second.idempotencyKey)
    expect(first.cancelUrl).toContain('/subscription?checkout=cancelled')
    expect(first.successUrl).toContain('/subscription/return?session_id={CHECKOUT_SESSION_ID}')
  })
})
