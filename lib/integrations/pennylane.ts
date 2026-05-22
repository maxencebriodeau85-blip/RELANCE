// Pennylane API integration
// Docs: https://pennylane.readme.io/reference/getting-started
// OAuth 2.0 Authorization Code flow

export const PENNYLANE_BASE = 'https://app.pennylane.com'
export const PENNYLANE_API  = 'https://app.pennylane.com/api/external/v1'

export interface PennylaneToken {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface PennylaneCustomer {
  source_id: string
  name: string
  emails: string[]
  billing_address?: {
    address: string
    postal_code: string
    city: string
    country_alpha2: string
  }
  reg_no?: string // SIREN
}

export interface PennylaneInvoice {
  id: string
  invoice_number: string
  amount: string           // string decimal
  currency: string
  date: string             // issued_date ISO
  deadline: string         // due_date ISO
  status: string           // 'draft' | 'outstanding' | 'paid' | 'cancelled'
  customer: PennylaneCustomer
}

export interface PennylaneInvoicesResponse {
  customer_invoices: PennylaneInvoice[]
  total_pages: number
  current_page: number
}

export function getPennylaneAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.PENNYLANE_CLIENT_ID || '',
    redirect_uri:  getPennylaneCallbackUrl(),
    response_type: 'code',
    scope:         'read',
    state,
  })
  return `${PENNYLANE_BASE}/oauth/authorize?${params}`
}

export function getPennylaneCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base}/api/integrations/pennylane/callback`
}

export async function exchangeCode(code: string): Promise<PennylaneToken> {
  const res = await fetch(`${PENNYLANE_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     process.env.PENNYLANE_CLIENT_ID || '',
      client_secret: process.env.PENNYLANE_CLIENT_SECRET || '',
      redirect_uri:  getPennylaneCallbackUrl(),
      code,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshToken(refresh_token: string): Promise<PennylaneToken> {
  const res = await fetch(`${PENNYLANE_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.PENNYLANE_CLIENT_ID || '',
      client_secret: process.env.PENNYLANE_CLIENT_SECRET || '',
      refresh_token,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  return res.json()
}

export async function fetchInvoices(
  accessToken: string,
  page = 1,
  perPage = 100
): Promise<PennylaneInvoicesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    // Only fetch outstanding (unpaid) invoices
    filter: JSON.stringify([{ field: 'status', operator: 'eq', value: 'outstanding' }]),
  })
  const res = await fetch(`${PENNYLANE_API}/customer_invoices?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Pennylane API error: ${res.status}`)
  return res.json()
}

// Map a Pennylane invoice to RelanceFlow invoice insert shape
export function mapPennylaneInvoice(inv: PennylaneInvoice, userId: string) {
  const address = inv.customer.billing_address
    ? [
        inv.customer.billing_address.address,
        inv.customer.billing_address.postal_code,
        inv.customer.billing_address.city,
      ]
        .filter(Boolean)
        .join(', ')
    : null

  return {
    user_id:        userId,
    client_name:    inv.customer.name,
    client_email:   inv.customer.emails[0] || '',
    client_address: address,
    client_siren:   inv.customer.reg_no || null,
    invoice_number: inv.invoice_number,
    amount:         parseFloat(inv.amount),
    due_date:       inv.deadline.split('T')[0],
    issued_date:    inv.date.split('T')[0],
    status:         'pending' as const,
    notes:          `Importé depuis Pennylane (ID: ${inv.id})`,
  }
}
