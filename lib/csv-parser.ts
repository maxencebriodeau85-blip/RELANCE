import { isValidDate } from './validation'
import Papa from 'papaparse'
import {
  MAX_IMPORT_ROWS,
  MAX_IMPORT_BYTES,
  validateInvoiceRows,
} from './invoice-input'

export interface CSVRow {
  [key: string]: string
}

export interface ParsedInvoice {
  client_name: string
  client_email: string
  invoice_number: string
  amount: number
  due_date: string
  remaining_amount?: number
  issued_date?: string
  client_address?: string
  client_siren?: string
}

export interface ColumnMapping {
  client_name: string
  client_email: string
  invoice_number: string
  amount: string
  due_date: string
  remaining_amount?: string
  issued_date?: string
  client_address?: string
  client_siren?: string
}

export interface ParseResult {
  headers: string[]
  rows: CSVRow[]
  totalRows: number
  error?: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface MappingResult {
  valid: ParsedInvoice[]
  errors: ValidationError[]
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
  const fail = (error: string): ParseResult => ({
    headers: [],
    rows: [],
    totalRows: 0,
    error,
  })
  if (file.size > MAX_IMPORT_BYTES)
    return fail('Fichier trop volumineux : 5 Mo maximum.')
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    let content: string
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
      content = new TextDecoder('utf-16le').decode(bytes)
    else if (bytes[0] === 0xfe && bytes[1] === 0xff)
      content = new TextDecoder('utf-16be').decode(bytes)
    else {
      try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      } catch {
        content = new TextDecoder('windows-1252').decode(bytes)
      }
    }
    return parseCSVString(content)
  } catch {
    return fail(
      'Impossible de lire ce fichier. Exportez-le en CSV puis réessayez.',
    )
  }
}

export function parseCSVString(csvString: string): ParseResult {
  const content = csvString
    .replace(/^\uFEFF/, '')
    .replace(/^sep=[;,\t]\r?\n/i, '')
  const results = Papa.parse<CSVRow>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    preview: MAX_IMPORT_ROWS + 1,
    transformHeader: (h) => h.trim(),
  })
  const headers = results.meta.fields || []
  const renamed = (
    results.meta as Papa.ParseMeta & { renamedHeaders?: Record<string, string> }
  ).renamedHeaders
  let error: string | undefined
  if (renamed && Object.keys(renamed).length)
    error =
      'Plusieurs colonnes portent le même nom. Renommez les en-têtes avant l’import.'
  else if (headers.some((h) => !h))
    error = 'Chaque colonne doit avoir un en-tête.'
  else if (results.errors.length)
    error = `CSV mal formé : vérifiez les séparateurs, les guillemets et le nombre de colonnes (ligne ${(results.errors[0].row ?? 0) + 2}).`
  else if (results.data.length > MAX_IMPORT_ROWS || results.meta.truncated)
    error = `Import limité à ${MAX_IMPORT_ROWS} lignes. Scindez le fichier avant de continuer.`
  return { headers, rows: results.data, totalRows: results.data.length, error }
}

export function parseDate(input: string): string | null {
  const value = input.trim()
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  const iso = match
    ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    : value
  return isValidDate(iso) ? iso : null
}
export function parseAmount(input: string): number | null {
  const value = input.trim().replace(/[€\s\u00a0\u202f]/g, '')
  // Explicit decimal formats; never accept trailing garbage or ambiguous commas.
  let normalized = value
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value))
    normalized = value.replace(/\./g, '').replace(',', '.')
  else if (/^\d+(,\d{1,2})?$/.test(value)) normalized = value.replace(',', '.')
  else if (!/^\d+(\.\d{1,2})?$/.test(value)) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 && amount <= 10000000
    ? Math.round(amount * 100) / 100
    : null
}

export function applyColumnMapping(
  rows: CSVRow[],
  mapping: ColumnMapping,
): MappingResult {
  const columns = Object.values(mapping).filter(Boolean)
  if (new Set(columns).size !== columns.length)
    return {
      valid: [],
      errors: [
        {
          row: 1,
          field: 'mapping',
          message: 'Une colonne ne peut être utilisée que pour un seul champ.',
        },
      ],
    }
  return validateInvoiceRows(
    rows.map((row) => {
      const value = (field: keyof ColumnMapping) =>
        mapping[field] ? (row[mapping[field]!] ?? '') : ''
      const issued = value('issued_date').trim()
      const remaining = value('remaining_amount').trim()
      return {
        client_name: value('client_name'),
        client_email: value('client_email'),
        invoice_number: value('invoice_number'),
        amount: parseAmount(value('amount')),
        due_date: parseDate(value('due_date')) || '',
        issued_date: issued ? parseDate(issued) || 'invalid' : undefined,
        remaining_amount: remaining
          ? (parseAmount(remaining) ?? NaN)
          : undefined,
        client_address: value('client_address'),
        client_siren: value('client_siren'),
      }
    }),
  )
}

export function suggestColumnMapping(
  headers: string[],
): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}

  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    remaining_amount: [/reste.*payer/i, /solde/i, /remaining/i],
    client_name: [
      /nom.*client/i,
      /client.*name/i,
      /raison.*sociale/i,
      /entreprise/i,
      /client/i,
      /nom/i,
    ],
    client_email: [
      /email.*client/i,
      /client.*email/i,
      /email/i,
      /mail/i,
      /courriel/i,
      /e-mail/i,
    ],
    invoice_number: [
      /num.*facture/i,
      /invoice.*num/i,
      /n°.*facture/i,
      /facture.*num/i,
      /ref.*facture/i,
      /facture/i,
      /invoice/i,
      /ref/i,
      /n°/i,
    ],
    amount: [
      /montant/i,
      /amount/i,
      /total.*ttc/i,
      /ttc/i,
      /prix/i,
      /somme/i,
      /amount/i,
    ],
    due_date: [
      /ech[eé]ance/i,
      /due.*date/i,
      /date.*ech/i,
      /date.*due/i,
      /date.*limite/i,
      /expiration/i,
    ],
    issued_date: [
      /emission/i,
      /issued/i,
      /date.*fact/i,
      /fact.*date/i,
      /creation/i,
      /cr[eé]ation/i,
    ],
    client_address: [/adresse/i, /address/i, /rue/i, /street/i],
    client_siren: [/siren/i, /rcs/i, /identifiant/i],
  }

  // Specific matches win globally before generic words such as "client".
  const used = new Set<string>()
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const fields = Object.keys(patterns) as (keyof ColumnMapping)[]
  const rounds = Math.max(...fields.map((field) => patterns[field].length))
  for (let rank = 0; rank < rounds; rank++) {
    for (const field of fields) {
      if (mapping[field] || !patterns[field][rank]) continue
      const header = headers.find(
        (h) =>
          !used.has(h) &&
          !(field === 'amount' && /rest|solde|remaining/i.test(normalize(h))) &&
          !(field === 'invoice_number' && /date/i.test(h)) &&
          !(field === 'client_name' && /mail|adresse|siren|siret/i.test(h)) &&
          patterns[field][rank].test(normalize(h)),
      )
      if (header) {
        mapping[field] = header
        used.add(header)
      }
    }
  }
  return mapping
}
