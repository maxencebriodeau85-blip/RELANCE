import { describe, expect, it } from 'vitest'
import {
  businessDate,
  nextReminder,
  outstanding,
  reminderBlock,
} from '../collection'
import { applyColumnMapping, parseAmount, parseDate } from '../csv-parser'
import type { Invoice } from '../database.types'
const now = new Date('2026-10-13T12:00:00Z')
const invoice = {
  amount: 100,
  amount_paid: 25,
  status: 'pending',
  due_date: '2026-10-01',
  reminders_paused: false,
  balance_checked_at: '2026-10-13T10:00:00Z',
} as Invoice
describe('collection safeguards', () => {
  it('uses the remaining balance, including decimal amounts', () => {
    expect(outstanding(invoice)).toBe(75)
    expect(outstanding({ ...invoice, amount: 100.1, amount_paid: 25.02 })).toBe(
      75.08,
    )
  })
  it('allows an overdue, verified and unpaused invoice', () =>
    expect(reminderBlock(invoice, now)).toBeNull())
  for (const patch of [
    { status: 'paid' },
    { status: 'disputed' },
    { reminders_paused: true },
    { reminders_paused: undefined },
    { promise_date: '2026-10-13' },
    { balance_checked_at: null },
    { balance_checked_at: '2026-10-01' },
    { balance_checked_at: 'invalid' },
    { balance_checked_at: '2026-10-14' },
    { due_date: '2026-10-13' },
  ]) {
    it(`blocks unsafe dispatch ${JSON.stringify(patch)}`, () =>
      expect(
        reminderBlock({ ...invoice, ...patch } as Invoice, now),
      ).not.toBeNull())
  }
  it('does not jump straight to escalation on an old imported invoice', () =>
    expect(nextReminder(60, 'standard', [])?.type).toBe('email_1'))
  it('honours the chosen scenario and stops after its last step', () => {
    expect(nextReminder(4, 'soft', [])).toBeUndefined()
    expect(nextReminder(4, 'firm', [])?.type).toBe('email_1')
    expect(nextReminder(60, 'soft', ['email_1', 'email_2'])).toBeUndefined()
  })
  it('uses the Paris calendar day at UTC midnight boundaries', () =>
    expect(businessDate(new Date('2026-10-12T23:30:00Z'))).toBe('2026-10-13'))
})
describe('CSV validation', () => {
  it('accepts French amounts and rejects partial/ambiguous parses', () => {
    expect(parseAmount('1 234,56 €')).toBe(1234.56)
    expect(parseAmount('1.234,56')).toBe(1234.56)
    for (const s of ['12abc', '-10', '1,2,3', '1.234', 'Infinity'])
      expect(parseAmount(s)).toBeNull()
  })
  it('rejects impossible dates', () => {
    expect(parseDate('31/02/2026')).toBeNull()
    expect(parseDate('29/02/2024')).toBe('2024-02-29')
  })
  it('keeps zero balance and unknown issue date without inventing data', () => {
    const result = applyColumnMapping(
      [
        {
          client: 'A',
          email: 'a@example.com',
          ref: 'F1',
          amount: '100',
          due: '01/10/2026',
          solde: '0',
        },
      ],
      {
        client_name: 'client',
        client_email: 'email',
        invoice_number: 'ref',
        amount: 'amount',
        due_date: 'due',
        remaining_amount: 'solde',
      },
    )
    expect(result.errors).toEqual([])
    expect(result.valid[0].remaining_amount).toBe(0)
    expect(result.valid[0].issued_date).toBeUndefined()
  })
})
