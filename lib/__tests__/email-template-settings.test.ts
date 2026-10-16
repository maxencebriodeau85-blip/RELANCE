import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), read: vi.fn(), saved: vi.fn(), remove: vi.fn(), upsert: vi.fn(), owner: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: mock.user },
  from: (table: string) => table === 'profiles' ? { select: () => ({ eq: () => ({ single: mock.profile }) }) } : {
    select: () => ({ eq: mock.read }),
    upsert: (value: unknown) => { mock.upsert(value); return { select: () => ({ single: mock.saved }) } },
    delete: () => ({ eq: (...args: unknown[]) => { mock.owner(...args); return { eq: mock.remove } } }),
  },
}) }))
import { DELETE, GET, PUT } from '@/app/api/email-templates/route'
import { REMINDER_TEMPLATES } from '../reminder-templates'
import { getEmailTemplate, interpolateTemplate, resolveEmailTemplate } from '../email-templates'
const template = { template_type: 'email_1', subject: 'Bonjour {{client_name}}', body: 'Solde : {{amount}}', enabled: true }
const save = (value: unknown = template) => PUT(new Request('https://encair.test/api/email-templates', { method: 'PUT', body: JSON.stringify(value) }))
const reset = () => DELETE(new Request('https://encair.test/api/email-templates?type=email_1', { method: 'DELETE' }))
beforeEach(() => {
  vi.clearAllMocks()
  mock.user.mockResolvedValue({ data: { user: { id: 'owner' } } })
  mock.profile.mockResolvedValue({ data: { plan: 'free_trial', trial_ends_at: '2099-01-01T00:00:00Z' }, error: null })
  mock.read.mockResolvedValue({ data: [template], error: null })
  mock.saved.mockResolvedValue({ data: template, error: null })
  mock.remove.mockResolvedValue({ error: null })
})
describe('Personalised reminders included in the offer', () => {
  it.each(['free_trial', 'starter', 'pro', 'business'])('saves for active %s accounts', async plan => {
    mock.profile.mockResolvedValue({ data: { plan, trial_ends_at: '2099-01-01T00:00:00Z' }, error: null })
    const response = await save()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ template })
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ ...template, user_id: 'owner' }))
  })
  it('requires authentication for every operation', async () => {
    mock.user.mockResolvedValue({ data: { user: null } })
    for (const operation of [GET, save, reset]) expect((await operation()).status).toBe(401)
    expect(mock.upsert).not.toHaveBeenCalled()
    expect(mock.remove).not.toHaveBeenCalled()
  })
  it('refuses modifications after trial expiration', async () => {
    mock.profile.mockResolvedValue({ data: { plan: 'free_trial', trial_ends_at: '2020-01-01' } })
    expect((await save()).status).toBe(403)
    expect((await reset()).status).toBe(403)
    expect(mock.upsert).not.toHaveBeenCalled()
  })
  it('surfaces read/write/reset failures rather than a successful empty state', async () => {
    mock.read.mockResolvedValue({ data: null, error: { code: 'offline' } })
    mock.saved.mockResolvedValue({ data: null, error: { code: 'offline' } })
    mock.remove.mockResolvedValue({ error: { code: 'offline' } })
    expect((await GET()).status).toBe(503)
    expect((await save()).status).toBe(503)
    expect((await reset()).status).toBe(503)
  })
  it('refuses invalid templates without truncating or coercing user content', async () => {
    for (const change of [{ subject: '' }, { body: ' ' }, { subject: 'x'.repeat(201) }, { body: 'x'.repeat(5001) }, { subject: 42 }, { enabled: 'yes' }, { user_id: 'other' }, { subject: 'Hello\nHeader' }, { body: '{{unknown_variable}}' }])
      expect((await save({ ...template, ...change })).status).toBe(422)
    expect(mock.upsert).not.toHaveBeenCalled()
  })
  it('scopes resets to the authenticated owner and reports success only after completion', async () => {
    expect((await reset()).status).toBe(200)
    expect(mock.owner).toHaveBeenCalledWith('user_id', 'owner')
    expect(mock.remove).toHaveBeenCalledWith('template_type', 'email_1')
  })
})
describe('Editor matches outgoing message', () => {
  const data = { creditorName: 'Atelier', creditorEmail: 'atelier@example.com', clientName: '<script>alert(1)</script>', invoiceNumber: 'F42', amount: 75, dueDate: '2026-10-01', daysOverdue: 15 }
  it.each(REMINDER_TEMPLATES)('uses the displayed defaults for $type', template => {
    const content = getEmailTemplate(template.type, data)
    expect(content.subject).toBe(interpolateTemplate(template.defaultSubject, data))
    expect(content.text).toBe(interpolateTemplate(template.defaultBody, data))
    expect(content.html).toContain('&lt;script&gt;')
    expect(content.html).not.toContain('<script>')
    expect(content.text).toContain('75,00')
  })
  it('uses a saved override and restores the same default when disabled or deleted', () => {
    expect(resolveEmailTemplate('email_1', data, template).text).toContain('Solde : 75,00')
    expect(resolveEmailTemplate('email_1', data, { ...template, enabled: false })).toEqual(getEmailTemplate('email_1', data))
    expect(resolveEmailTemplate('email_1', data, null)).toEqual(getEmailTemplate('email_1', data))
  })
})
