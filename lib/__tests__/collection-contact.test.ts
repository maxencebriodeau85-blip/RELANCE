import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), invoice: vi.fn(), write: vi.fn(), saved: vi.fn(), filter: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: mock.user },
  from: (table: string) => table === 'profiles' ? { select: () => ({ eq: () => ({ single: mock.profile }) }) } : {
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mock.invoice }) }) }),
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
  it('reports database outages without claiming the invoice does not exist', async () => {
    mock.invoice.mockResolvedValue({ data: null, error: { message: 'offline' } })
    expect((await save()).status).toBe(503)
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('distinguishes a missing invoice from a failed read', async () => {
    mock.invoice.mockResolvedValue({ data: null, error: null })
    expect((await save()).status).toBe(404)
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('reports profile read failures as temporary outages', async () => {
    mock.profile.mockResolvedValue({ data: null, error: { message: 'offline' } })
    expect((await save()).status).toBe(503)
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('rejects oversized and invalid JSON before querying the invoice', async () => {
    expect((await save({ notes: 'x'.repeat(17000) })).status).toBe(413)
    const response = await PATCH(new Request('https://encair.test/api/invoices/invoice/collection', { method: 'PATCH', body: '{' }), { params: Promise.resolve({ id: 'invoice' }) })
    expect(response.status).toBe(400)
    expect(mock.invoice).not.toHaveBeenCalled()
    expect(mock.write).not.toHaveBeenCalled()
  })
  it('keeps optimistic concurrency and never claims a failed write succeeded', async () => {
    mock.saved.mockResolvedValueOnce({ data: null, error: null })
    expect((await save()).status).toBe(409)
    mock.saved.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    expect((await save()).status).toBe(503)
  })
})
