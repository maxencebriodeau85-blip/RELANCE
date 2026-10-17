import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { InvoicePDF } from '../invoice-pdf'
import { invoiceExportCSV, csvCell } from '../invoice-export'
import type { Invoice } from '../database.types'
const invoice = { id:'invoice',invoice_number:'F1',client_name:'Client',client_email:null,amount:100,amount_paid:40,status:'pending',due_date:'2026-01-01',issued_date:null,notes:'SECRET INTERNE',vat_mention:'',balance_checked_at:null } as Invoice
function allText(node: unknown): string {
  if (Array.isArray(node)) return node.map(allText).join(' ')
  if (isValidElement<{ children?: unknown }>(node)) return allText(node.props.children)
  return typeof node === 'string' || typeof node === 'number' ? String(node) : ''
}
describe('Exports reflect collection data', () => {
  it('exports an empty email and the outstanding balance', () => {
    const csv=invoiceExportCSV([invoice])
    expect(csv).toContain('"Client";"";"100,00";"60,00"')
    expect(csv).not.toContain('null')
  })
  it.each(['=1+1','  =1+1','\t=1+1','+SUM(A1)','@SUM(A1)','-1+1'])('neutralises spreadsheet formulas %s', value => {
    expect(csvCell(value).startsWith('"\'')).toBe(true)
  })
  it('escapes quotes while keeping ordinary references intact', () => {
    expect(csvCell('FA-123 "A"')).toBe('"FA-123 ""A"""')
  })
  it('shows the remaining balance without internal notes, a payment link or invented tax terms', () => {
    const text=allText(InvoicePDF({ invoice, profile:{ company_name:'Entreprise',address:null,postal_code:null,city:null,siren:null,email:'owner@example.invalid',phone:null } }))
    expect(text).toContain('Reste à payer')
    expect(text).toMatch(/60,00/)
    expect(text).toMatch(/40,00/)
    for(const forbidden of ['SECRET INTERNE','Payer en ligne','293B','Total HT','pénalités de retard']) expect(text).not.toContain(forbidden)
    expect(text).toContain('Non confirmé')
  })
})
