import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getDaysOverdue } from '@/lib/metrics'
import type { Invoice } from '@/lib/database.types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

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

  const inv = data as Invoice & { profiles: { company_name: string | null } }

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
