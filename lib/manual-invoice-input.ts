import { validateInvoiceRows } from './invoice-input'
import { parseAmount } from './csv-parser'

/** Reuse import rules without silently coercing or truncating business data. */
export function validateManualInvoice(body: Record<string, unknown>) {
  const amount = typeof body.amount === 'string' ? parseAmount(body.amount) : body.amount
  const { valid, errors } = validateInvoiceRows([{ ...body, amount }])
  const fields: Record<string, string> = Object.fromEntries(errors.map(e => [e.field, e.message]))
  const optionalText = (key: string, max: number) => {
    const raw = body[key]
    if (raw == null) return ''
    if (typeof raw !== 'string' || raw.trim().length > max) {
      fields[key] = `Texte attendu, ${max} caractères maximum.`
      return ''
    }
    return raw.trim()
  }
  const notes = optionalText('notes', 1000)
  const description = optionalText('description', 500)
  const vatMention = optionalText('vat_mention', 200)
  const invoice = valid[0]
  return {
    fields,
    invoice: invoice && !Object.keys(fields).length ? {
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      due_date: invoice.due_date,
      issued_date: invoice.issued_date || null,
      client_address: invoice.client_address || null,
      client_siren: invoice.client_siren || null,
      notes: notes || null,
      description: description || null,
      vat_mention: vatMention,
    } : null,
  }
}
