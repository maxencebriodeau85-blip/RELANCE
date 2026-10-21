import type { Invoice } from './database.types'
import { outstanding } from './collection'
import { getDaysOverdue } from './metrics'

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  // Spreadsheet programs can ignore whitespace before interpreting formulas.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return `"${text.replace(/"/g, '""')}"`
}
export function invoiceExportCSV(invoices: Invoice[]) {
  const rows: unknown[][] = [['N° Facture','Client','Email','Montant (€)','Reste à payer','Échéance','Statut','Jours de retard']]
  for (const invoice of invoices) rows.push([
    invoice.invoice_number, invoice.client_name, invoice.client_email,
    Number(invoice.amount).toFixed(2).replace('.', ','), outstanding(invoice).toFixed(2).replace('.', ','),
    invoice.due_date, invoice.status, getDaysOverdue(invoice),
  ])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n')
}
