import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ParsedInvoice } from '@/lib/csv-parser'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { invoices } = body as { invoices: ParsedInvoice[] }

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json({ error: 'Aucune facture à importer' }, { status: 400 })
    }

    // Check plan limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, invoice_count_month')
      .eq('id', user.id)
      .single()

    const planLimits: Record<string, number> = {
      free_trial: 10,
      starter: 30,
      pro: 200,
      business: 1000,
    }

    const limit = planLimits[profile?.plan || 'free_trial']
    const currentCount = profile?.invoice_count_month || 0

    if (currentCount + invoices.length > limit) {
      return NextResponse.json(
        {
          error: `Limite de votre plan atteinte. Votre plan ${profile?.plan} permet ${limit} factures/mois. Vous en avez déjà ${currentCount}.`,
        },
        { status: 403 }
      )
    }

    // Insert invoices
    const toInsert = invoices.map((inv) => ({
      user_id: user.id,
      client_name: inv.client_name,
      client_email: inv.client_email,
      client_address: inv.client_address || null,
      client_siren: inv.client_siren || null,
      invoice_number: inv.invoice_number,
      amount: inv.amount,
      due_date: inv.due_date,
      issued_date: inv.issued_date || new Date().toISOString().split('T')[0],
      status: 'pending' as const,
    }))

    const { data, error } = await supabase.from('invoices').insert(toInsert).select('id')

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: 'Erreur lors de l\'import' }, { status: 500 })
    }

    // Update invoice count
    await supabase
      .from('profiles')
      .update({ invoice_count_month: currentCount + invoices.length })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      imported: data?.length || invoices.length,
      ids: data?.map((d) => d.id),
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
