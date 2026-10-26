import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  rpc: vi.fn(),
  worker: vi.fn(),
  automation: true,
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => {
    mocks.admin()
    return {
      rpc: mocks.rpc,
      from: () => {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => mocks.worker(),
        }
        return q
      },
    }
  },
}))
vi.mock('@/lib/service-capabilities', () => ({
  serviceCapabilities: () => ({ automationAvailable: mocks.automation }),
}))
vi.mock('@/lib/reminder-service', () => ({ sendReminder: vi.fn() }))
import { GET as reminders } from '@/app/api/cron/reminders/route'
import { GET as status } from '@/app/api/cron/status/route'
const call = (handler: (r: Request) => Promise<Response>, auth?: string) =>
  handler(
    new Request('https://encair.test/api/cron', {
      headers: auth ? { authorization: auth } : {},
    }),
  )
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()
beforeEach(() => {
  vi.clearAllMocks()
  mocks.automation = true
  vi.stubEnv('CRON_SECRET', 'test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.test')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'qa-only')
  mocks.rpc.mockResolvedValue({ data: null, error: null })
})
afterEach(() => vi.unstubAllEnvs())
describe('Blocked reminder runs', () => {
  it('rejects a bad secret without opening a database client', async () => {
    mocks.automation = false
    for (const auth of [undefined, 'Bearer wrong']) {
      expect((await call(reminders, auth)).status).toBe(401)
      expect((await call(status, auth)).status).toBe(401)
    }
    vi.stubEnv('CRON_SECRET', '')
    expect((await call(reminders, 'Bearer ')).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('records a misconfigured run before answering the same 503', async () => {
    mocks.automation = false
    const response = await call(reminders, 'Bearer test')
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: 'Service de relance non configuré.',
      sent: 0,
    })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).toHaveBeenCalledWith('record_collection_worker_attempt', {
      p_reason: 'automation_not_configured',
    })
  })
  it('still answers 503 when the trace cannot be written', async () => {
    mocks.automation = false
    mocks.rpc.mockRejectedValue(Error('offline'))
    expect((await call(reminders, 'Bearer test')).status).toBe(503)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    mocks.rpc.mockClear()
    expect((await call(reminders, 'Bearer test')).status).toBe(503)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('records a failed claim', async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === 'claim_collection_worker'
        ? { data: null, error: { code: 'XX000' } }
        : { data: null, error: null },
    )
    expect((await call(reminders, 'Bearer test')).status).toBe(503)
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'record_collection_worker_attempt',
      { p_reason: 'claim_failed' },
    )
  })
})
describe('Worker status', () => {
  const row = (completed: string | null) => ({
    data: {
      started_at: completed,
      completed_at: completed,
      last_attempt_at: completed,
      last_blocked_reason: null,
      last_result: { ok: true, sent: 3, attempted: 3 },
    },
    error: null,
  })
  it('is healthy after a recent completed run, without caching or PII', async () => {
    const at = hoursAgo(2)
    mocks.worker.mockResolvedValue(row(at))
    const response = await call(status, 'Bearer test')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      configured: true,
      last_attempt_at: at,
      last_blocked_reason: null,
      started_at: at,
      completed_at: at,
      last_ok: true,
      last_sent: 3,
      stale: false,
    })
  })
  it('alerts when no run completed in 26 hours or ever', async () => {
    mocks.worker.mockResolvedValue(row(hoursAgo(27)))
    let response = await call(status, 'Bearer test')
    expect(response.status).toBe(503)
    expect((await response.json()).stale).toBe(true)
    mocks.worker.mockResolvedValue(row(null))
    response = await call(status, 'Bearer test')
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ stale: true, last_ok: true })
  })
  it('alerts when the last recent run failed', async () => {
    const recent = row(hoursAgo(1))
    mocks.worker.mockResolvedValue({ ...recent, data: { ...recent.data, last_result: { ok: false, sent: 0, attempted: 1 } } })
    const response = await call(status, 'Bearer test')
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ stale: false, last_ok: false })
  })
  it('alerts when automation is not configured and exposes the blocked reason', async () => {
    mocks.automation = false
    mocks.worker.mockResolvedValue({
      data: {
        ...row(hoursAgo(1)).data,
        last_blocked_reason: 'automation_not_configured',
      },
      error: null,
    })
    const response = await call(status, 'Bearer test')
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      configured: false,
      last_blocked_reason: 'automation_not_configured',
      stale: false,
    })
  })
  it('alerts when the worker state cannot be read', async () => {
    mocks.worker.mockResolvedValue({ data: null, error: { code: 'XX000' } })
    const response = await call(status, 'Bearer test')
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ stale: true, completed_at: null })
  })
})
