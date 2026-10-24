import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReminderConfirmation, reminderContent, validReminderConfirmation } from '../reminder-confirmation'
import { formatEuro, getDaysOverdue } from '../metrics'
import type { Invoice, Profile } from '../database.types'
const invoice = { id: 'invoice', user_id: 'owner', updated_at: '2026-10-19', client_name: 'Boulangerie', client_email: 'client@example.invalid', invoice_number: 'F1', amount: 2869.66, amount_paid: 506.51, due_date: '2026-01-01', status: 'pending' } as Invoice
const profile = { email: 'owner@example.invalid', company_name: 'Entreprise' } as Profile
const now = 1792400000000
const content = reminderContent(invoice, profile, 'email_1')
afterEach(() => vi.unstubAllEnvs())
describe('reviewed reminders', () => {
  it.each(['email_1', 'email_2', 'email_3'] as const)('uses the remaining balance and neutral wording for %s', type => {
    const email = reminderContent(invoice, profile, type)
    expect(email.text).toContain('2 363,15')
    expect(email.html).toContain('solde restant à régler')
    expect(email.html).not.toMatch(/Montant TTC|1 clic|L441|40 €|frais à votre charge|mise en demeure/i)
  })
  it('formats cents and suppresses overdue days on settled invoices', () => {
    expect(formatEuro(1182.1)).toContain('1 182,10')
    expect(getDaysOverdue({ ...invoice, status: 'paid' })).toBe(0)
  })
  it('binds confirmation to the owner, recipient, version, template and sender for ten minutes', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'qa-only-secret')
    const token = createReminderConfirmation(invoice, profile, 'email_1', content, now)
    expect(validReminderConfirmation(token, invoice, profile, 'email_1', content, now)).toBe(true)
    expect(validReminderConfirmation(token, invoice, profile, 'email_1', content, now + 600001)).toBe(false)
    expect(validReminderConfirmation(token + 'a', invoice, profile, 'email_1', content, now)).toBe(false)
    for (const change of [{ user_id: 'other' }, { client_email: 'other@example.invalid' }, { updated_at: 'changed' }]) {
      expect(validReminderConfirmation(token, { ...invoice, ...change }, profile, 'email_1', content, now)).toBe(false)
    }
    expect(validReminderConfirmation(token, invoice, profile, 'email_2', content, now)).toBe(false)
    expect(validReminderConfirmation(token, invoice, profile, 'email_1', { ...content, text: 'Changed' }, now)).toBe(false)
    expect(validReminderConfirmation(token, invoice, { ...profile, email: 'other@example.invalid' }, 'email_1', content, now)).toBe(false)
  })
})
