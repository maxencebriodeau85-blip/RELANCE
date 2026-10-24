import { describe, expect, it } from 'vitest'
import { validateManualInvoice } from '../manual-invoice-input'
const base = { client_name: 'Client', invoice_number: 'F-1', amount: '1 234,56', due_date: '2026-01-30' }
describe('Manual invoice business data', () => {
  it('preserves cents and permits an overdue invoice with unknown issue date', () => {
    expect(validateManualInvoice(base).invoice).toMatchObject({ amount: 1234.56, issued_date: null, client_email: null, description: null, vat_mention: '' })
  })
  it.each([true, {}, '12xyz', 1.234, -1, Infinity])('rejects an invalid amount %s', amount => {
    expect(validateManualInvoice({ ...base, amount }).fields).toHaveProperty('amount')
  })
  it.each([{ client_name: {} }, { invoice_number: 123 }, { client_email: false }, { client_siren: '1234567890' }, { client_siren: 'x123456789' }, { client_address: 'a'.repeat(501) }, { notes: 'a'.repeat(1001) }, { description: [] }, { due_date: '2026-02-30' }, { issued_date: '2026-02-01' }])('rejects instead of coercing or truncating %s', invalid => {
    expect(validateManualInvoice({ ...base, ...invalid }).invoice).toBeNull()
  })
})
