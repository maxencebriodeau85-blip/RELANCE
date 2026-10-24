import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), count: vi.fn(), duplicate: vi.fn(), insert: vi.fn(), saved: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: mock.user },
  from: (table: string) => {
    if (table === 'profiles') return { select: () => ({ eq: () => ({ single: mock.profile }) }) }
    return {
      select: (_: string, options?: unknown) => ({ eq: () => options ? { gte: mock.count } : { eq: () => ({ maybeSingle: mock.duplicate }) } }),
      insert: (value: unknown) => { mock.insert(value); return { select: () => ({ single: mock.saved }) } },
    }
  },
}) }))
import { POST } from '@/app/api/invoices/create/route'
const save = (extra = {}) => POST(new Request('https://encair.test/api/invoices/create', { method: 'POST', body: JSON.stringify({ client_name: 'Client', invoice_number: 'F1', amount: '123,45', due_date: '2026-01-01', ...extra }) }))
beforeEach(() => {
  vi.clearAllMocks()
  mock.user.mockResolvedValue({ data: { user: { id: 'owner' } } })
  mock.profile.mockResolvedValue({ data: { plan: 'starter' }, error: null })
  mock.count.mockResolvedValue({ count: 0, error: null })
  mock.duplicate.mockResolvedValue({ data: null, error: null })
  mock.saved.mockResolvedValue({ data: { id: 'saved' }, error: null })
})
describe('Manual creation failure boundaries', () => {
  it('writes the authenticated owner, pauses reminders and preserves the amount', async () => {
    expect((await save({ user_id: 'other', reminders_paused: false })).status).toBe(201)
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', reminders_paused: true, amount: 123.45, issued_date: null }))
  })
  it.each(['profile', 'count', 'duplicate'] as const)('does not write when %s verification fails', async stage => {
    mock[stage].mockResolvedValue({ data: null, count: null, error: { message: 'offline' } })
    expect((await save()).status).toBe(503)
    expect(mock.insert).not.toHaveBeenCalled()
  })
  it('refuses missing authentication and exhausted quotas', async () => {
    mock.user.mockResolvedValueOnce({ data: { user: null } })
    expect((await save()).status).toBe(401)
    mock.count.mockResolvedValue({ count: 100, error: null })
    expect((await save()).status).toBe(403)
    expect(mock.insert).not.toHaveBeenCalled()
  })
  it('does not report success without an inserted row', async () => {
    mock.saved.mockResolvedValue({ data: null, error: null })
    expect((await save()).status).toBe(503)
  })
})
