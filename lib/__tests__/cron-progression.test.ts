import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
  invoices: vi.fn(),
  history: vi.fn(),
  queries: [] as string[],
  dataset: null as null | ReturnType<typeof invoice>[],
  cursor: null as string | null,
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      let after: string | null = null
      let limit = Infinity
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
      q.gt = (_: string, value: string) => { after = value; return q }
      q.limit = (value: number) => { limit = value; return q }
      q.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          table === 'invoices'
            ? mocks.dataset
              ? { data: mocks.dataset.filter((row) => !after || row.id > after).slice(0, limit), error: null }
              : mocks.invoices()
            : mocks.history(),
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
  vi.resetAllMocks()
  mocks.dataset = null
  mocks.cursor = null
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
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
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


describe('Bounded cron rotation with persistent checkpoints', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.rpc.mockImplementation(async (name: string, args?: { p_cursor: string | null }) => {
      if (name === 'claim_collection_worker')
        return { data: { lease_id: 'lease', cursor_id: mocks.cursor }, error: null }
      if (name === 'finish_collection_worker') mocks.cursor = args!.p_cursor
      return { data: true, error: null }
    })
  })
  const timedRun = async () => {
    const response = run()
    await vi.runAllTimersAsync()
    return response
  }
  const row = (index: number, owner = 'owner-a') => ({
    ...invoice(String(index).padStart(4, '0')), user_id: owner,
  })
  it('checkpoints a rejected dispatch and reaches the next account on retry', async () => {
    mocks.dataset = [row(1), row(2, 'owner-b')]
    mocks.send.mockRejectedValueOnce(new Error('network failure before provider dispatch'))
    const failed = await timedRun()
    expect(failed.status).toBe(503)
    expect(await failed.json()).toMatchObject({ ok: false, attempted: 1, scanned: 1, sent: 0 })
    expect(mocks.cursor).toBe('0001')
    expect((await timedRun()).status).toBe(200)
    expect(mocks.send).toHaveBeenLastCalledWith('0002', 'owner-b', 'email_1', 'automatic')
  })
  it('continues with the next account after an unconfirmed provider result', async () => {
    mocks.dataset = [row(1), row(2, 'owner-b')]
    mocks.send.mockResolvedValueOnce({ status: 502 })
    expect((await timedRun()).status).toBe(503)
    expect(mocks.cursor).toBe('0001')
    expect((await timedRun()).status).toBe(200)
    expect(mocks.send).toHaveBeenLastCalledWith('0002', 'owner-b', 'email_1', 'automatic')
  })
  it('scans pages of 100 ineligible rows then reaches another account and wraps', async () => {
    mocks.dataset = Array.from({ length: 206 }, (_, i) => ({
      ...row(i + 1, i < 205 ? 'owner-a' : 'owner-b'), is_sample: i < 205,
    }))
    expect(await (await timedRun()).json()).toMatchObject({ scanned: 100, attempted: 0 })
    expect(mocks.cursor).toBe('0100')
    expect(await (await timedRun()).json()).toMatchObject({ scanned: 100, attempted: 0 })
    expect(mocks.cursor).toBe('0200')
    expect(await (await timedRun()).json()).toMatchObject({ scanned: 6, attempted: 1, sent: 1 })
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith('0206', 'owner-b', 'email_1', 'automatic')
    await timedRun()
    expect(mocks.cursor).toBeNull()
  })
  it('limits dispatches to 25 and resumes without dropping the remaining rows', async () => {
    mocks.dataset = Array.from({ length: 27 }, (_, i) => row(i + 1, i < 25 ? 'owner-a' : 'owner-b'))
    expect(await (await timedRun()).json()).toMatchObject({ attempted: 25, sent: 25, scanned: 25 })
    expect(mocks.cursor).toBe('0025')
    expect(await (await timedRun()).json()).toMatchObject({ attempted: 2, sent: 2 })
    expect(mocks.send).toHaveBeenCalledTimes(27)
    expect(mocks.send).toHaveBeenLastCalledWith('0027', 'owner-b', 'email_1', 'automatic')
  })
})
