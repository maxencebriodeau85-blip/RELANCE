import { describe, expect, it } from 'vitest'
import {
  applyColumnMapping,
  parseCSVString,
  suggestColumnMapping,
  parseCSVFile,
} from '../csv-parser'
import { validateInvoiceRows } from '../invoice-input'
const row = {
  client_name: 'Client',
  client_email: 'A@EXAMPLE.COM',
  invoice_number: 'F1',
  amount: 100,
  due_date: '2026-12-01',
}
describe('Import integrity', () => {
  it('accepts a missing email column or empty cells without inventing an address', () => {
    for (const client_email of [undefined, null, '', '   ']) {
      const result = validateInvoiceRows([{ ...row, client_email }])
      expect(result.errors).toEqual([])
      expect(result.valid[0].client_email).toBeNull()
    }
    const result = applyColumnMapping([{ client: 'Client', ref: 'F1', amount: '100', due: '01/10/2026' }], {
      client_name: 'client', client_email: '', invoice_number: 'ref', amount: 'amount', due_date: 'due',
    })
    expect(result.errors).toEqual([])
    expect(result.valid[0].client_email).toBeNull()
  })
  it('still rejects malformed supplied addresses and non-text values', () => {
    for (const client_email of ['invalide', 'test@domain', 'x'.repeat(255), true, 123])
      expect(validateInvoiceRows([{ ...row, client_email }]).errors).toContainEqual(expect.objectContaining({ field: 'client_email' }))
  })
  it('never turns a blank balance into a settlement', () => {
    for (const remaining_amount of ['', null, undefined])
      expect(
        validateInvoiceRows([{ ...row, remaining_amount }]).valid[0],
      ).not.toHaveProperty('remaining_amount')
    expect(
      validateInvoiceRows([{ ...row, remaining_amount: 0 }]).valid[0]
        .remaining_amount,
    ).toBe(0)
  })
  it.each([true, false, '12oops', '12', -1, 1.234, Infinity])(
    'rejects invalid numeric values %s',
    (amount) =>
      expect(
        validateInvoiceRows([{ ...row, amount }]).errors.length,
      ).toBeGreaterThan(0),
  )
  it('rejects every occurrence of a repeated reference', () => {
    const result = validateInvoiceRows([
      row,
      { ...row, invoice_number: ' F1 ' },
    ])
    expect(result.valid).toHaveLength(0)
    expect(result.errors.map((e) => e.row)).toEqual([2, 3])
  })
  it('keeps automatic mapping one-to-one, even with misleading headers', () => {
    const map = suggestColumnMapping([
      'Email client',
      'Nom client',
      'Date facture',
      'N° facture',
      'Montant restant',
      'Montant TTC',
      'Échéance',
    ])
    expect(map.client_name).toBe('Nom client')
    expect(map.client_email).toBe('Email client')
    expect(map.invoice_number).toBe('N° facture')
    expect(map.amount).toBe('Montant TTC')
    expect(map.due_date).toBe('Échéance')
    expect(new Set(Object.values(map)).size).toBe(Object.values(map).length)
  })
  it('rejects a mapping that reuses a column', () => {
    expect(
      applyColumnMapping([], {
        client_name: 'A',
        client_email: 'A',
        invoice_number: 'B',
        amount: 'C',
        due_date: 'D',
      }).errors,
    ).toHaveLength(1)
  })
  it('supports Excel separator directives and quoted multiline cells', () => {
    const result = parseCSVString(
      '\uFEFFsep=;\r\nNom;Note\r\nA;"ligne 1\nligne 2"\r\n',
    )
    expect(result.error).toBeUndefined()
    expect(result.rows[0].Note).toBe('ligne 1\nligne 2')
  })
  it('rejects duplicate headers and oversized imports', () => {
    expect(parseCSVString('Nom;Nom\nA;B').error).toMatch(/même nom/)
    expect(
      parseCSVString(
        'A;B\n' + Array.from({ length: 501 }, () => 'a;b').join('\n'),
      ).error,
    ).toMatch(/500/)
  })
  it('reads Windows-1252 exports without corrupting accented client names', async () => {
    const bytes = new Uint8Array([
      78, 111, 109, 59, 82, 101, 102, 10, 67, 97, 102, 233, 59, 70, 49,
    ])
    const result = await parseCSVFile(new File([bytes], 'export.csv'))
    expect(result.error).toBeUndefined()
    expect(result.rows[0].Nom).toBe('Café')
  })
})
