import { beforeEach, describe, it, expect, vi } from 'vitest'
import type Stripe from 'stripe'
const mocks = vi.hoisted(() => ({
  subscription: vi.fn(),
  plan: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: mocks.read }) }),
      update: (data: unknown) => {
        mocks.write(data)
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'u1' }, error: null }),
            }),
          }),
        }
      },
    }),
  }),
}))
// billing-sync uses relative imports which resolve to the same alias target.
vi.mock('@/lib/stripe', () => ({
  stripe: { subscriptions: { retrieve: mocks.subscription } },
  getPlanFromPriceId: mocks.plan,
}))
import { syncCheckout } from '../billing-sync'
const session = {
  mode: 'subscription',
  status: 'complete',
  payment_status: 'paid',
  metadata: { userId: 'u1' },
  subscription: 'sub_1',
  customer: 'cus_1',
} as unknown as Stripe.Checkout.Session
beforeEach(() => {
  vi.clearAllMocks()
  mocks.subscription.mockResolvedValue({
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    metadata: { userId: 'u1' },
    items: { data: [{ price: { id: 'p1' } }] },
  })
  mocks.plan.mockReturnValue('starter')
  mocks.read.mockResolvedValue({
    data: { stripe_customer_id: 'cus_1', stripe_subscription_id: null },
    error: null,
  })
})
describe('Verified payment activation', () => {
  it('rejects another user’s payment', async () => {
    await expect(syncCheckout(session, 'other')).rejects.toThrow('autorisée')
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('never grants access for an incomplete checkout', async () => {
    expect(await syncCheckout({ ...session, status: 'open' }, 'u1')).toBe(false)
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('waits for an asynchronous payment to settle', async () => {
    expect(
      await syncCheckout({ ...session, payment_status: 'unpaid' }, 'u1'),
    ).toBe(false)
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('never grants access for a cancelled subscription or unknown price', async () => {
    mocks.subscription.mockResolvedValueOnce({
      customer: 'cus_1',
      metadata: { userId: 'u1' },
      status: 'canceled',
    })
    expect(await syncCheckout(session, 'u1')).toBe(false)
    mocks.plan.mockReturnValueOnce(null)
    await expect(syncCheckout(session, 'u1')).rejects.toThrow('non reconnu')
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('writes the paid plan only after checking ownership and current Stripe state', async () => {
    expect(await syncCheckout(session, 'u1')).toBe(true)
    expect(mocks.write).toHaveBeenCalledWith({
      plan: 'starter',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      subscription_status: 'active',
    })
  })
})
