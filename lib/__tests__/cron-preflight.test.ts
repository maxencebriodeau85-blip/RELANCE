import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  capabilities: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.admin,
}))
vi.mock('@/lib/service-capabilities', () => ({
  serviceCapabilities: mocks.capabilities,
}))
import { GET } from '@/app/api/cron/reminders/route'

const request = (authorization?: string) =>
  new Request('https://encair.test/api/cron/reminders', {
    headers: authorization ? { authorization } : {},
  })

describe('Cron security and operational preflight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    mocks.capabilities.mockReturnValue({ automationAvailable: true })
  })

  it('rejects missing authorization before opening the database', async () => {
    expect((await GET(request())).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('rejects an incorrect bearer token before opening the database', async () => {
    expect((await GET(request('Bearer incorrect'))).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('rejects calls when the secret is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await GET(request('Bearer cron-test-secret'))).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('fails closed when email automation is not configured', async () => {
    mocks.capabilities.mockReturnValue({ automationAvailable: false })
    expect((await GET(request('Bearer cron-test-secret'))).status).toBe(503)
    expect(mocks.admin).not.toHaveBeenCalled()
  })

  it('does not send when the worker lease cannot be claimed', async () => {
    mocks.admin.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'XX000' } }),
    })
    expect((await GET(request('Bearer cron-test-secret'))).status).toBe(503)
  })
})
