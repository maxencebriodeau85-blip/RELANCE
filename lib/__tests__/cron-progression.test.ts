import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
  invoices: vi.fn(),
  history: vi.fn(),
  queries: [] as string[],
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const method of [
        'select',
        'in',
        'eq',
        'not',
        'gte',
        'lt',
        'gt',
        'order',
        'neq',
      ])
        q[method] = () => q
      q.limit = () => q
      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          table === 'invoices' ? mocks.invoices() : mocks.history(),
        ).then(resolve)
      return q
    },
  }),
}))
vi.mock('@/lib/service-capabilities', () => ({
  serviceCapabilities: () => ({ automationAvailable: true }),
}))
vi.mock('@/lib/reminder-service', () => ({ sendReminder: mocks.send }))
import { GET } from '@/app/api/cron/reminders/route'
const invoice = (id: string) => ({
  id,
  user_id: 'owner',
  client_email: 'client@example.com',
  amount: 100,
  amount_paid: 0,
  status: 'pending',
  reminders_paused: false,
  balance_checked_at: new Date(Date.now() - 1000).toISOString(),
  due_date: '2020-01-01',
  profiles: { active_scenario: 'standard' },
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test')
  mocks.rpc.mockImplementation(async (n: string) => ({
    data:
      n === 'claim_collection_worker'
        ? { lease_id: 'lease', cursor_id: null }
        : true,
    error: null,
  }))
  mocks.history.mockReturnValue({ data: [], error: null })
  mocks.invoices.mockReturnValue({
    data: [invoice('a'), invoice('b')],
    error: null,
  })
  mocks.send.mockResolvedValue({ status: 200 })
})
const run = () =>
  GET(
    new Request('https://encair.test/api/cron/reminders', {
      headers: { authorization: 'Bearer test' },
    }),
  )
describe('Cron progress and failures', () => {
  it('advances past a failed delivery and records failure without pretending success', async () => {
    mocks.send.mockResolvedValue({ status: 503 })
    expect((await run()).status).toBe(503)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'finish_collection_worker',
      expect.objectContaining({
        p_cursor: 'a',
        p_result: expect.objectContaining({ ok: false, attempted: 1 }),
      }),
    )
  })
  it('advances past skipped invoices and resets at the end', async () => {
    mocks.invoices.mockReturnValueOnce({
      data: [{ ...invoice('b'), reminders_paused: true }],
      error: null,
    })
    expect((await run()).status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'finish_collection_worker',
      expect.objectContaining({ p_cursor: 'b' }),
    )
    expect(mocks.send).not.toHaveBeenCalled()
    mocks.invoices.mockReturnValueOnce({ data: [], error: null })
    await run()
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'finish_collection_worker',
      expect.objectContaining({ p_cursor: null }),
    )
  })
  it('does not run alongside another lease', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null })
    expect((await run()).status).toBe(202)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('reports failed history reads and failed checkpoint persistence', async () => {
    mocks.history.mockReturnValueOnce({ error: { code: 'XX000' } })
    expect((await run()).status).toBe(503)
    expect(mocks.send).not.toHaveBeenCalled()
    mocks.invoices.mockReturnValueOnce({ data: [], error: null })
    mocks.rpc.mockImplementation(async (n: string) =>
      n === 'claim_collection_worker'
        ? { data: { lease_id: 'lease', cursor_id: null } }
        : { error: { code: 'XX000' } },
    )
    expect((await run()).status).toBe(503)
  })
})
