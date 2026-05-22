// POST /api/integrations/webhook?secret=xxx
// Universal webhook — compatible Zapier, Make, n8n, custom scripts.
// Accepts one invoice or an array of invoices.
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface WebhookPayload {
  client_name: string
  client_email: string
  invoice_number: string
  amount: number | string
  due_date: string
  issued_date?: string
  client_address?: string
  client_siren?: string
  notes?: string
}

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function normalizeDate(d: string): string | null {
  if (!d) return null
  // Accept DD/MM/YYYY or YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [day, month, year] = d.split('/')
    return `${year}-${month}-${day}`
  }
  if (isValidDate(d)) return d
  return null
}

function validatePayload(p: WebhookPayload): string | null {
  if (!p.client_name?.trim()) return 'client_name requis'
  if (!p.client_email?.trim() || !isValidEmail(p.client_email)) return 'client_email invalide'
  if (!p.invoice_number?.trim()) return 'invoice_number requis'
  const amount = parseFloat(String(p.amount))
  if (isNaN(amount) || amount <= 0) return 'amount invalide (doit être > 0)'
  if (!normalizeDate(p.due_date)) return 'due_date invalide (format YYYY-MM-DD ou DD/MM/YYYY)'
  return null
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!secret) {
    return NextResponse.json({ error: 'Paramètre ?secret= manquant' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Look up user by webhook_secret
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan, trial_ends_at, invoice_count_month')
    .eq('webhook_secret', secret)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Clé webhook invalide' }, { status: 401 })
  }

  const p = profile as any

  // Trial check
  if (p.plan === 'free_trial' && p.trial_ends_at && new Date(p.trial_ends_at) < new Date()) {
    return NextResponse.json({ error: "Période d'essai expirée" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const payloads: WebhookPayload[] = Array.isArray(body) ? body : [body as WebhookPayload]

  if (payloads.length === 0) return NextResponse.json({ error: 'Aucune facture' }, { status: 400 })
  if (payloads.length > 100) return NextResponse.json({ error: 'Maximum 100 factures par appel' }, { status: 400 })

  const results: { invoice_number: string; status: 'created' | 'skipped' | 'error'; reason?: string }[] = []

  for (const payload of payloads) {
    const validationError = validatePayload(payload)
    if (validationError) {
      results.push({ invoice_number: payload.invoice_number || '?', status: 'error', reason: validationError })
      continue
    }

    // Deduplicate by invoice_number
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', p.id)
      .eq('invoice_number', payload.invoice_number.trim())
      .maybeSingle()

    if (existing) {
      results.push({ invoice_number: payload.invoice_number, status: 'skipped', reason: 'Déjà importée' })
      continue
    }

    const { error: insertErr } = await supabase.from('invoices').insert({
      user_id:        p.id,
      client_name:    payload.client_name.trim(),
      client_email:   payload.client_email.trim().toLowerCase(),
      client_address: payload.client_address?.trim() || null,
      client_siren:   payload.client_siren?.replace(/\D/g, '').slice(0, 9) || null,
      invoice_number: payload.invoice_number.trim(),
      amount:         parseFloat(String(payload.amount)),
      due_date:       normalizeDate(payload.due_date)!,
      issued_date:    normalizeDate(payload.issued_date || '') || new Date().toISOString().split('T')[0],
      notes:          payload.notes?.trim() || null,
      status:         'pending',
    } as never)

    if (insertErr) {
      results.push({ invoice_number: payload.invoice_number, status: 'error', reason: insertErr.message })
    } else {
      results.push({ invoice_number: payload.invoice_number, status: 'created' })
    }
  }

  const created = results.filter((r) => r.status === 'created').length
  if (created > 0) {
    await supabase.from('profiles').update({
      invoice_count_month: (p.invoice_count_month || 0) + created,
    } as never).eq('id', p.id)
  }

  return NextResponse.json({
    success: true,
    created,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors:  results.filter((r) => r.status === 'error').length,
    results,
  })
}
