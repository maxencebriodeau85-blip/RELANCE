import Papa from 'papaparse'

export interface CSVRow {
  [key: string]: string
}

export interface ParsedInvoice {
  client_name: string
  client_email: string
  invoice_number: string
  amount: number
  due_date: string
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

export function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const rows = results.data as CSVRow[]
        resolve({
          headers,
          rows,
          totalRows: rows.length,
        })
      },
      error: (error) => {
        resolve({
          headers: [],
          rows: [],
          totalRows: 0,
          error: error.message,
        })
      },
    })
  })
}

export function parseCSVString(csvString: string): ParseResult {
  const results = Papa.parse<CSVRow>(csvString, {
    header: true,
    skipEmptyLines: true,
  })

  return {
    headers: results.meta.fields || [],
    rows: results.data,
    totalRows: results.data.length,
    error: results.errors.length > 0 ? results.errors[0].message : undefined,
  }
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  const cleaned = dateStr.trim()

  // Try dd/mm/yyyy
  const frenchMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (frenchMatch) {
    const [, day, month, year] = frenchMatch
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  // Try dd-mm-yyyy
  const dashMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, day, month, year] = dashMatch
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  // Try yyyy-mm-dd (ISO)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const date = new Date(cleaned)
    if (!isNaN(date.getTime())) {
      return cleaned
    }
  }

  // Try generic Date parsing
  const genericDate = new Date(cleaned)
  if (!isNaN(genericDate.getTime())) {
    return genericDate.toISOString().split('T')[0]
  }

  return null
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === '') return null

  // Remove currency symbols, spaces
  const cleaned = amountStr
    .trim()
    .replace(/[€$£\s]/g, '')
    .replace(/\s/g, '')
    // Handle French number format: 1.234,56 → 1234.56
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.')

  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return null
  return Math.round(num * 100) / 100
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function applyColumnMapping(
  rows: CSVRow[],
  mapping: ColumnMapping
): MappingResult {
  const valid: ParsedInvoice[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, index) => {
    const rowNum = index + 2 // 1-indexed, +1 for header
    const rowErrors: ValidationError[] = []

    // client_name
    const clientName = mapping.client_name ? row[mapping.client_name]?.trim() : ''
    if (!clientName) {
      rowErrors.push({
        row: rowNum,
        field: 'client_name',
        message: 'Nom du client requis',
        value: clientName,
      })
    }

    // client_email
    const clientEmail = mapping.client_email ? row[mapping.client_email]?.trim() : ''
    if (!clientEmail) {
      rowErrors.push({
        row: rowNum,
        field: 'client_email',
        message: 'Email du client requis',
        value: clientEmail,
      })
    } else if (!isValidEmail(clientEmail)) {
      rowErrors.push({
        row: rowNum,
        field: 'client_email',
        message: 'Email invalide',
        value: clientEmail,
      })
    }

    // invoice_number
    const invoiceNumber = mapping.invoice_number ? row[mapping.invoice_number]?.trim() : ''
    if (!invoiceNumber) {
      rowErrors.push({
        row: rowNum,
        field: 'invoice_number',
        message: 'Numéro de facture requis',
        value: invoiceNumber,
      })
    }

    // amount
    const amountRaw = mapping.amount ? row[mapping.amount]?.trim() : ''
    const amount = parseAmount(amountRaw || '')
    if (amount === null) {
      rowErrors.push({
        row: rowNum,
        field: 'amount',
        message: 'Montant invalide (doit être un nombre positif)',
        value: amountRaw,
      })
    }

    // due_date
    const dueDateRaw = mapping.due_date ? row[mapping.due_date]?.trim() : ''
    const dueDate = parseDate(dueDateRaw || '')
    if (!dueDate) {
      rowErrors.push({
        row: rowNum,
        field: 'due_date',
        message: 'Date d\'échéance invalide (formats acceptés : JJ/MM/AAAA, AAAA-MM-JJ)',
        value: dueDateRaw,
      })
    }

    // Optional fields
    const issuedDateRaw = mapping.issued_date ? row[mapping.issued_date]?.trim() : ''
    const issuedDate = issuedDateRaw ? parseDate(issuedDateRaw) || undefined : undefined

    const clientAddress = mapping.client_address ? row[mapping.client_address]?.trim() || undefined : undefined
    const clientSiren = mapping.client_siren ? row[mapping.client_siren]?.trim() || undefined : undefined

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      valid.push({
        client_name: clientName!,
        client_email: clientEmail!,
        invoice_number: invoiceNumber!,
        amount: amount!,
        due_date: dueDate!,
        issued_date: issuedDate,
        client_address: clientAddress,
        client_siren: clientSiren,
      })
    }
  })

  return { valid, errors }
}

export function suggestColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}

  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    client_name: [/nom.*client/i, /client.*name/i, /raison.*sociale/i, /entreprise/i, /client/i, /nom/i],
    client_email: [/email.*client/i, /client.*email/i, /email/i, /mail/i, /courriel/i, /e-mail/i],
    invoice_number: [/num.*facture/i, /invoice.*num/i, /n°.*facture/i, /facture.*num/i, /ref.*facture/i, /facture/i, /invoice/i, /ref/i, /n°/i],
    amount: [/montant/i, /amount/i, /total.*ttc/i, /ttc/i, /prix/i, /somme/i, /amount/i],
    due_date: [/ech[eé]ance/i, /due.*date/i, /date.*ech/i, /date.*due/i, /date.*limite/i, /expiration/i],
    issued_date: [/emission/i, /issued/i, /date.*fact/i, /fact.*date/i, /creation/i, /cr[eé]ation/i],
    client_address: [/adresse/i, /address/i, /rue/i, /street/i],
    client_siren: [/siren/i, /siret/i, /rcs/i, /identifiant/i],
  }

  for (const header of headers) {
    for (const [field, regexps] of Object.entries(patterns) as [keyof ColumnMapping, RegExp[]][]) {
      if (!mapping[field]) {
        for (const regex of regexps) {
          if (regex.test(header)) {
            mapping[field] = header
            break
          }
        }
      }
    }
  }

  return mapping
}
