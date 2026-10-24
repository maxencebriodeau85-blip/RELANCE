import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invoice, Profile } from '../database.types'

const mock = vi.hoisted(() => ({
  invoice: vi.fn(), profile: vi.fn(), template: vi.fn(), history: vi.fn(),
  rpc: vi.fn(), write: vi.fn(), filter: vi.fn(), fetch: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: async () => ({
  rpc: mock.rpc,
  from: (table: string) => {
    let writing = false
    const read = () => table === 'invoices' ? mock.invoice() : table === 'profiles' ? mock.profile() : table === 'email_template_overrides' ? mock.template() : mock.history()
    const q = {
      select: () => q,
      eq: (...args: unknown[]) => { mock.filter(table, ...args); return q },
      neq: () => q, gte: () => q, in: () => q,
      update: (data: unknown) => { writing = true; mock.write(table, data); return q },
      single: read, maybeSingle: read, limit: read,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(writing ? { error: null } : read()).then(resolve),
    }
    return q
  },
}) }))
import { sendReminder } from '../reminder-service'
import { createReminderConfirmation, reminderContent } from '../reminder-confirmation'

const now = new Date('2026-10-21T12:00:00Z')
const invoice = {
  id: 'invoice', user_id: 'owner', client_name: 'Boulangerie',
  client_email: 'client@example.invalid', invoice_number: 'F1',
  amount: 2869.66, amount_paid: 506.51, status: 'pending',
  due_date: '2026-10-01', updated_at: now.toISOString(),
  balance_checked_at: now.toISOString(), reminders_paused: false,
} as Invoice
const profile = { id: 'owner', plan: 'starter', email: 'owner@example.invalid', company_name: 'Entreprise', auto_reminders: true } as Profile
const run = () => sendReminder(invoice.id, profile.id, 'email_1', 'manual', createReminderConfirmation(invoice, profile, 'email_1', reminderContent(invoice, profile, 'email_1')))

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now)
  vi.stubEnv('RESEND_API_KEY', 'test-only'); vi.stubEnv('RESEND_FROM_EMAIL', 'sender@example.invalid')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'qa-only-secret')
  vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_test-only')
  vi.stubGlobal('fetch', mock.fetch)
  mock.invoice.mockResolvedValue({ data: invoice, error: null })
  mock.profile.mockResolvedValue({ data: profile, error: null })
  mock.template.mockResolvedValue({ data: null, error: null })
  mock.history.mockResolvedValue({ data: [], error: null })
  mock.rpc.mockResolvedValue({ data: 'claim', error: null })
  mock.fetch.mockResolvedValue(new Response(JSON.stringify({ id: 'email' }), { status: 200 }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Dispatch after review and reservation', () => {
  it.each(['manual', 'automatic'] as const)('refuses %s delivery before reservation when callbacks cannot be verified', async source => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '')
    const response = source === 'manual' ? await run() : await sendReminder(invoice.id, profile.id, 'email_1', 'automatic')
    expect(response.status).toBe(503)
    expect(mock.history).not.toHaveBeenCalled()
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.fetch).not.toHaveBeenCalled()
    expect(mock.write).not.toHaveBeenCalled()
  })

  it.each(['', '  ', 're_your-key', 'placeholder'])('refuses unconfigured sending credentials %j', async key => {
    vi.stubEnv('RESEND_API_KEY', key)
    expect((await run()).status).toBe(503)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('sends the reviewed partial balance once with a stable idempotency key', async () => {
    expect((await run()).status).toBe(200)
    expect(mock.fetch).toHaveBeenCalledTimes(1)
    const options = mock.fetch.mock.calls[0][1]
    const email = JSON.parse(options.body)
    expect(email.to).toEqual([invoice.client_email])
    expect(email.text).toContain('2 363,15')
    expect(options.headers['Idempotency-Key']).toBe('reminder-claim')
    expect(mock.filter).toHaveBeenCalledWith('invoices', 'user_id', 'owner')
  })

  it.each([
    { amount_paid: 2869.66 }, { amount_paid: 1000 }, { status: 'disputed' },
    { reminders_paused: true }, { client_email: 'changed@example.invalid' },
  ])('cancels an obsolete invoice before delivery: %j', async change => {
    mock.invoice.mockResolvedValueOnce({ data: invoice }).mockResolvedValueOnce({ data: { ...invoice, ...change } })
    expect((await run()).status).toBe(409)
    expect(mock.fetch).not.toHaveBeenCalled()
    expect(mock.write).toHaveBeenCalledWith('reminders', { status: 'failed' })
  })

  it.each([{ email: 'changed@example.invalid' }, { company_name: 'Changed sender' }])('cancels if sender details change after review: %j', async change => {
    mock.profile.mockResolvedValueOnce({ data: profile }).mockResolvedValueOnce({ data: { ...profile, ...change } })
    expect((await run()).status).toBe(409)
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('cancels if the template changes during reservation', async () => {
    mock.template.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { enabled: true, subject: 'Changed', body: 'Different message' } })
    expect((await run()).status).toBe(409)
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('requires confirmation to remain valid at the last check', async () => {
    mock.rpc.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date(now.getTime() + 600001))
      return { data: 'claim', error: null }
    })
    expect((await run()).status).toBe(409)
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('blocks automatic delivery if automation is stopped during reservation', async () => {
    mock.profile.mockResolvedValueOnce({ data: profile }).mockResolvedValueOnce({ data: { ...profile, auto_reminders: false } })
    expect((await sendReminder(invoice.id, profile.id, 'email_1', 'automatic')).status).toBe(409)
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('does not report missing invoices when the initial read failed', async () => {
    mock.invoice.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    expect((await run()).status).toBe(503)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it('reports a failed final template check without sending', async () => {
    mock.template.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    expect((await run()).status).toBe(503)
    expect(mock.fetch).not.toHaveBeenCalled()
  })

  it.each([409, 500])('preserves the reservation on ambiguous provider response %s', async status => {
    mock.fetch.mockResolvedValue(new Response('', { status }))
    expect((await run()).status).toBe(502)
    expect(mock.write).not.toHaveBeenCalled()
  })

  it('preserves the reservation after a timeout or lost response', async () => {
    mock.fetch.mockRejectedValue(new Error('timeout'))
    expect((await run()).status).toBe(502)
    expect(mock.write).not.toHaveBeenCalled()
  })

  it('does not reserve or send a second reminder within 24 hours', async () => {
    mock.history.mockResolvedValue({ data: [{ id: 'previous' }] })
    expect((await run()).status).toBe(429)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.fetch).not.toHaveBeenCalled()
  })
})
