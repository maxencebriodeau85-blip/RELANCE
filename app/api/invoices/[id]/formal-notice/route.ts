import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateFormalNotice, type FormalNoticeData } from '@/lib/formal-notice-template'
import { getDaysOverdue } from '@/lib/metrics'
import { assertPlan } from '@/lib/access-control'
import type { Invoice, Profile } from '@/lib/database.types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const inv = invoice as Invoice
    const profile = profileData as Profile | null

    // Mise en demeure PDF is a Pro feature — gate by plan (+ trial check).
    const gate = assertPlan(profile, 'pro')
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const daysOverdue = getDaysOverdue(inv)

    const noticeData: FormalNoticeData = {
      creditorName: profile?.company_name || 'Mon Entreprise',
      creditorAddress: '',
      creditorSiren: profile?.siren || undefined,
      creditorEmail: profile?.email || user.email || '',
      debtorName: inv.client_name,
      debtorAddress: inv.client_address || '',
      debtorSiren: inv.client_siren || undefined,
      invoiceNumber: inv.invoice_number,
      invoiceAmount: inv.amount,
      invoiceDueDate: inv.due_date,
      invoiceIssuedDate: inv.issued_date,
      daysOverdue,
    }

    const result = generateFormalNotice(noticeData)

    return NextResponse.json({
      content: result.content,
      penalties: result.penalties,
      totalAmount: result.totalAmount,
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.client_name,
        amount: inv.amount,
        dueDate: inv.due_date,
        daysOverdue,
      },
    })
  } catch (err) {
    console.error('Formal notice error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
