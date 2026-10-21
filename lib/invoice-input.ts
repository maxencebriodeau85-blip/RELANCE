import { isValidDate, isValidEmail } from './validation'

export const MAX_IMPORT_ROWS = 500
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export interface InvoiceInput {
  client_name: string
  client_email: string | null
  invoice_number: string
  amount: number
  due_date: string
  remaining_amount?: number
  issued_date?: string
  client_address?: string
  client_siren?: string
  expected_updated_at?: string | null
}
export interface InvoiceInputError {
  row: number
  field: string
  message: string
  value?: string
}
export const validMoney = (n: unknown): n is number =>
  typeof n === 'number' &&
  Number.isFinite(n) &&
  n >= 0 &&
  n <= 10000000 &&
  Math.abs(n * 100 - Math.round(n * 100)) < 0.00001
const text = (x: unknown) => (typeof x === 'string' ? x.trim() : '')

/** No coercion: null, booleans and partial numeric strings are never payments. */
export function validateInvoiceRows(rows: unknown[]) {
  const valid: InvoiceInput[] = [],
    errors: InvoiceInputError[] = []
  const refs = new Map<string, number[]>()
  rows.forEach((raw, index) => {
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {}
    const item: InvoiceInput = {
      client_name: text(row.client_name),
      client_email: text(row.client_email).toLowerCase() || null,
      invoice_number: text(row.invoice_number),
      amount: row.amount as number,
      due_date: text(row.due_date),
    }
    const fail = (field: string, message: string) =>
      errors.push({ row: index + 2, field, message })
    const before = errors.length
    if (!item.client_name || item.client_name.length > 200)
      fail('client_name', 'Nom du client requis, 200 caractères maximum.')
    if ((row.client_email != null && typeof row.client_email !== 'string') || (item.client_email && (item.client_email.length > 254 || !isValidEmail(item.client_email))))
      fail('client_email', 'Adresse email invalide.')
    if (!item.invoice_number || item.invoice_number.length > 50)
      fail('invoice_number', 'Référence requise, 50 caractères maximum.')
    if (!validMoney(item.amount) || item.amount === 0)
      fail('amount', 'Montant positif requis, avec deux décimales maximum.')
    if (!isValidDate(item.due_date))
      fail('due_date', 'Date d’échéance invalide.')
    if (row.issued_date != null && row.issued_date !== '') {
      item.issued_date = text(row.issued_date)
      if (!isValidDate(item.issued_date) || item.issued_date > item.due_date)
        fail(
          'issued_date',
          'Date d’émission invalide ou postérieure à l’échéance.',
        )
    }
    if (row.remaining_amount != null && row.remaining_amount !== '') {
      item.remaining_amount = row.remaining_amount as number
      if (
        !validMoney(item.remaining_amount) ||
        item.remaining_amount > item.amount
      )
        fail('remaining_amount', 'Solde invalide ou supérieur au montant TTC.')
    }
    if (row.client_address != null && row.client_address !== '') {
      item.client_address = text(row.client_address)
      if (
        typeof row.client_address !== 'string' ||
        item.client_address.length > 500
      )
        fail('client_address', 'Adresse limitée à 500 caractères.')
    }
    if (row.client_siren != null && row.client_siren !== '') {
      const siren = text(row.client_siren).replace(/\s/g, '')
      if (!/^\d{9}$/.test(siren))
        fail('client_siren', 'SIREN attendu : exactement 9 chiffres.')
      else item.client_siren = siren
    }
    if ('expected_updated_at' in row) {
      if (
        row.expected_updated_at !== null &&
        (typeof row.expected_updated_at !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T/.test(row.expected_updated_at) ||
          !Number.isFinite(Date.parse(row.expected_updated_at)))
      )
        fail('expected_updated_at', 'Rechargez l’aperçu avant de confirmer.')
      else item.expected_updated_at = row.expected_updated_at as string | null
    }
    refs.set(item.invoice_number, [
      ...(refs.get(item.invoice_number) || []),
      index + 2,
    ])
    if (errors.length === before) valid.push(item)
  })
  for (const [ref, lines] of refs)
    if (ref && lines.length > 1)
      for (const row of lines)
        errors.push({
          row,
          field: 'invoice_number',
          message: `Référence « ${ref} » répétée aux lignes ${lines.join(', ')}.`,
        })
  const duplicated = new Set(
    [...refs].filter(([, lines]) => lines.length > 1).map(([ref]) => ref),
  )
  return {
    valid: valid.filter((row) => !duplicated.has(row.invoice_number)),
    errors,
  }
}
