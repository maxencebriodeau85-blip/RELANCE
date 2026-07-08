import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getDaysOverdue } from '@/lib/metrics'
import { rateLimit, getIp } from '@/lib/rate-limit'
import type { Invoice } from '@/lib/database.types'

export async function GET(request: Request) {
  // Public, unauthenticated endpoint — throttle per IP so the payment_token
  // (the only secret guarding invoice data) can't be brute-forced at scale.
  const rl = rateLimit(getIp(request), {
    key: 'pay-invoice',
    limit: 60,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessayez dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const reconcile = searchParams.get('reconcile') === 'true'
  const sessionId = searchParams.get('session_id')

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, profiles(company_name)')
    .eq('payment_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Facture introuvable ou lien invalide' }, { status: 404 })
  }

  let inv = data as Invoice & { profiles: { company_name: string | null } }

  // Webhook-miss safety net: when the debtor returns from Stripe with
  // ?paid=true&session_id=..., ask Stripe directly whether THIS checkout
  // session succeeded, and reconcile. Guarantees the creditor sees the
  // payment even if the webhook never fired. Retrieving the exact session
  // by ID (rather than listing the account's most recent sessions) matters
  // because `sessions.list` returns the whole Stripe account's recent
  // checkouts — including unrelated subscription checkouts — so the target
  // session could fall out of a small "recent" window under normal traffic.
  if (reconcile && inv.status !== 'paid') {
    try {
      let paidSession: { metadata?: { invoice_id?: string } | null } | undefined

      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (session.metadata?.invoice_id === inv.id && session.payment_status === 'paid') {
          paidSession = session
        }
      } else {
        // Fallback for Checkout Sessions created before session_id was added
        // to the success_url (Stripe bakes success_url in at session-creation
        // time, so links already emailed to debtors won't carry it) — best
        // effort, same scan used before this reconciliation was made precise.
        const sessions = await stripe.checkout.sessions.list({ limit: 5 })
        paidSession = sessions.data.find(
          (s) => s.metadata?.invoice_id === inv.id && s.payment_status === 'paid'
        )
      }

      if (paidSession) {
        await supabase
          .from('invoices')
          .update({ status: 'paid' } as never)
          .eq('id', inv.id)
        inv = { ...inv, status: 'paid' }
      }
    } catch (e) {
      console.error('pay reconcile error:', e)
      // non-fatal — fall through and return current status
    }
  }

  return NextResponse.json({
    id: inv.id,
    invoice_number: inv.invoice_number,
    amount: inv.amount,
    due_date: inv.due_date,
    client_name: inv.client_name,
    creditor_name: inv.profiles?.company_name || 'Votre créancier',
    days_overdue: getDaysOverdue(inv),
    status: inv.status,
  })
}
