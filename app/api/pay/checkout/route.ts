import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'
import type { Invoice } from '@/lib/database.types'

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, profiles(company_name, email)')
    .eq('payment_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  }

  const inv = data as Invoice & { profiles: { company_name: string | null; email: string } }

  if (inv.status === 'paid') {
    return NextResponse.json({ error: 'Cette facture est déjà réglée' }, { status: 400 })
  }

  const appUrl = getAppUrl()
  const amountCents = Math.round(inv.amount * 100)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: {
            name: `Facture ${inv.invoice_number}`,
            description: `Règlement facture — ${inv.profiles?.company_name || 'Créancier'}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/pay/${token}?paid=true`,
    cancel_url: `${appUrl}/pay/${token}`,
    metadata: {
      invoice_id: inv.id,
      payment_token: token,
      user_id: inv.user_id,
    },
    locale: 'fr',
    payment_intent_data: {
      metadata: {
        invoice_id: inv.id,
        payment_token: token,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
