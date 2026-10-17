import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), invoice: vi.fn(), write: vi.fn(), saved: vi.fn(), filter: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: mock.user },
  from: (table: string) => table === 'profiles' ? { select: () => ({ eq: () => ({ single: mock.profile }) }) } : {
    select: () => ({ eq: () => ({ eq: () => ({ single: mock.invoice }) }) }),
    update: (value: unknown) => {
      mock.write(value)
      const query = { eq: (...args: unknown[]) => { mock.filter(...args); return query }, select: () => ({ maybeSingle: mock.saved }) }
      return query
    },
  },
}) }))
import { PATCH } from '@/app/api/invoices/[id]/collection/route'
const version = '2026-10-16T00:00:00Z'
const invoice = { id: 'invoice', amount: 100, amount_paid: 25, status: 'pending', client_email: null, updated_at: version }
const body = { expected_updated_at: version, amount_paid: 25, reminders_paused: false, disputed: false, notes: '', promise_date: null }
const save = (extra = {}) => PATCH(new Request('https://encair.test/api/invoices/invoice/collection', { method: 'PATCH', body: JSON.stringify({ ...body, ...extra }) }), { params: Promise.resolve({ id: 'invoice' }) })
beforeEach(() => {
  vi.clearAllMocks()
  mock.user.mockResolvedValue({ data: { user: { id: 'owner' } } })
  mock.profile.mockResolvedValue({ data: { plan: 'starter' } })
  mock.invoice.mockResolvedValue({ data: invoice })
  mock.saved.mockResolvedValue({ data: { id: 'invoice' }, error: null })
})
describe('Recipient completion with version protection', () => {
  it('normalises a new email and pauses sending until reviewed', async () => {
    expect((await save({ client_email: '  CLIENT@EXAMPLE.COM  ' })).status).toBe(200)
    expect(mock.write).toHaveBeenCalledWith(expect.objectContaining({ client_email: 'client@example.com', reminders_paused: true, amount_paid: 25 }))
    expect(mock.filter).toHaveBeenCalledWith('user_id', 'owner')
    expect(mock.filter).toHaveBeenCalledWith('updated_at', version)
  })
  it('keeps tracking usable without an email but cannot enable sending', async () => {
    expect((await save({ client_email: null })).status).toBe(200)
    expect(mock.write).toHaveBeenCalledWith(expect.objectContaining({ client_email: null, reminders_paused: true }))
  })
  it('preserves a known address when omitted by an older client', async () => {
    mock.invoice.mockResolvedValue({ data: { ...invoice, client_email: 'a@example.com' } })
    expect((await save()).status).toBe(200)
    expect(mock.write).toHaveBeenCalledWith(expect.objectContaining({ client_email: 'a@example.com', reminders_paused: false }))
  })
  it('rejects invalid addresses and stale versions without saving', async () => {
    for (const client_email of ['invalid', 32, true, {}]) expect((await save({ client_email })).status).toBe(422)
    expect((await save({ expected_updated_at: '2020-01-01T00:00:00Z' })).status).toBe(409)
    expect(mock.write).not.toHaveBeenCalled()
  })
})
