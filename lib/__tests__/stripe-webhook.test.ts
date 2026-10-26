import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  event: vi.fn(),
  subscription: vi.fn(),
  checkout: vi.fn(),
  plan: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  result: vi.fn(),
  filter: vi.fn(),
}))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mocks.event },
    subscriptions: { retrieve: mocks.subscription },
  },
  getPlanFromPriceId: mocks.plan,
}))
vi.mock('@/lib/billing-sync', () => ({ syncCheckout: mocks.checkout }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
      update: (data: unknown) => {
        mocks.write(data)
        const query = {
          eq: (...args: unknown[]) => {
            mocks.filter(...args)
            return query
          },
          is: (...args: unknown[]) => {
            mocks.filter(...args)
            return query
          },
          then: (resolve: (result: unknown) => unknown) =>
            Promise.resolve(mocks.result()).then(resolve),
        }
        return query
      },
    }),
  }),
}))
import { POST } from '@/app/api/stripe/webhook/route'

const current = {
  id: 'sub_current',
  customer: 'cus_owner',
  status: 'active',
  items: { data: [{ price: { id: 'price_founder' } }] },
}
const send = (type: string, object: unknown) => {
  mocks.event.mockReturnValue({ type, data: { object } })
  return POST(
    new Request('https://example.test/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-signature' },
      body: '{}',
    }),
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('STRIPE_SECRET_KEY', 'test-placeholder')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-placeholder')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-placeholder')
  mocks.subscription.mockResolvedValue(current)
  mocks.plan.mockReturnValue('starter')
  mocks.read.mockResolvedValue({
    data: { id: 'user_owner', stripe_subscription_id: 'sub_current' },
    error: null,
  })
  mocks.result.mockReturnValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Stripe lifecycle delivery', () => {
  it.each(['created', 'updated', 'resumed', 'paused', 'deleted'])(
    'retrieves the current state for subscription.%s',
    async (action) => {
      const response = await send(`customer.subscription.${action}`, {
        id: 'sub_current',
        status: 'canceled',
      })
      expect(response.status).toBe(200)
      expect(mocks.subscription).toHaveBeenCalledWith('sub_current')
      expect(mocks.write).toHaveBeenCalledWith({
        stripe_subscription_id: 'sub_current',
        plan: 'starter',
      })
      expect(mocks.filter).toHaveBeenCalledWith(
        'stripe_subscription_id',
        'sub_current',
      )
    },
  )
  it.each([
    { parent: { subscription_details: { subscription: 'sub_current' } } },
    { subscription: 'sub_current' },
  ])('reconciles renewal invoices across API versions', async (invoice) => {
    expect((await send('invoice.paid', invoice)).status).toBe(200)
    expect(mocks.subscription).toHaveBeenCalledWith('sub_current')
    expect(mocks.write).toHaveBeenCalled()
  })
  it('does not reactivate a canceled subscription from a late paid invoice', async () => {
    mocks.subscription.mockResolvedValue({ ...current, status: 'canceled' })
    await send('invoice.paid', { subscription: 'sub_current' })
    expect(mocks.write).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'free_trial',
        stripe_subscription_id: null,
      }),
    )
  })
  it('does not overwrite a different subscription', async () => {
    mocks.read.mockResolvedValue({
      data: { stripe_subscription_id: 'sub_other' },
      error: null,
    })
    await send('customer.subscription.updated', current)
    expect(mocks.write).not.toHaveBeenCalled()
    mocks.subscription.mockResolvedValue({ ...current, status: 'canceled' })
    await send('customer.subscription.deleted', current)
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('retries database failures rather than acknowledging a lost activation', async () => {
    mocks.result.mockReturnValue({ error: new Error('Database unavailable') })
    expect((await send('customer.subscription.updated', current)).status).toBe(
      500,
    )
  })
  it('delegates asynchronous settlement to verified checkout activation', async () => {
    const session = {
      id: 'cs_test',
      mode: 'subscription',
      payment_status: 'paid',
      metadata: { userId: 'user_owner' },
    }
    await send('checkout.session.async_payment_succeeded', session)
    expect(mocks.checkout).toHaveBeenCalledWith(session)
  })
  it.each([
    { id: 'cs_link', mode: 'subscription', metadata: {} },
    { id: 'cs_payment', mode: 'payment', metadata: { userId: 'user_owner' } },
  ])(
    'acknowledges a checkout session Encair did not create ($id)',
    async (session) => {
      expect((await send('checkout.session.completed', session)).status).toBe(
        200,
      )
      expect(mocks.checkout).not.toHaveBeenCalled()
      expect(mocks.write).not.toHaveBeenCalled()
    },
  )
  it('acknowledges a foreign subscription instead of retrying on its unknown price', async () => {
    mocks.plan.mockReturnValue(null)
    mocks.read.mockResolvedValue({ data: null, error: null })
    expect((await send('customer.subscription.updated', current)).status).toBe(
      200,
    )
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('still retries an unknown price for an Encair customer (misconfigured env)', async () => {
    mocks.plan.mockReturnValue(null)
    expect((await send('customer.subscription.updated', current)).status).toBe(
      500,
    )
    expect(mocks.write).not.toHaveBeenCalled()
  })
  it('rejects an invalid signature before accessing the database', async () => {
    mocks.event.mockImplementationOnce(() => {
      throw new Error('invalid')
    })
    expect((await send('invoice.paid', {})).status).toBe(400)
    expect(mocks.subscription).not.toHaveBeenCalled()
    expect(mocks.write).not.toHaveBeenCalled()
  })
})
