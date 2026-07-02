import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getDaysOverdue } from '@/lib/metrics'
import type { Invoice } from '@/lib/database.types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const reconcile = searchParams.get('reconcile') === 'true'

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
  // ?paid=true and the invoice isn't marked paid yet, ask Stripe directly
  // whether a checkout session for this invoice succeeded, and reconcile.
  // Guarantees the creditor sees the payment even if the webhook never fired.
  if (reconcile && inv.status !== 'paid') {
    try {
      const sessions = await stripe.checkout.sessions.list({ limit: 5 })
      const paid = sessions.data.find(
        (s) =>
          s.metadata?.invoice_id === inv.id &&
          s.payment_status === 'paid'
      )
      if (paid) {
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
