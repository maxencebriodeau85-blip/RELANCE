import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ParsedInvoice } from '@/lib/csv-parser'
import type { Profile } from '@/lib/database.types'
import { PLAN_LIMITS } from '@/lib/metrics'

const MAX_BATCH_SIZE = 500 // hard cap per request, regardless of plan

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

    if (invoices.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_SIZE} factures par import.` },
        { status: 400 }
      )
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null

    // Check trial expiration
    if (profile?.plan === 'free_trial' && profile?.trial_ends_at) {
      if (new Date(profile.trial_ends_at) < new Date()) {
        return NextResponse.json(
          { error: "Votre période d'essai est expirée. Passez à un plan payant pour continuer." },
          { status: 403 }
        )
      }
    }

    const limit = PLAN_LIMITS[profile?.plan ?? 'free_trial'] ?? PLAN_LIMITS.free_trial
    const currentCount = profile?.invoice_count_month || 0

    if (currentCount + invoices.length > limit) {
      return NextResponse.json(
        {
          error: `Limite de votre plan atteinte. Votre plan ${profile?.plan} permet ${limit} factures/mois. Vous en avez déjà ${currentCount}.`,
        },
        { status: 403 }
      )
    }

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
      status: 'pending',
    }))

    const { data, error } = await supabase
      .from('invoices')
      .insert(toInsert as never)
      .select('id')

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 })
    }

    await supabase
      .from('profiles')
      .update({ invoice_count_month: currentCount + invoices.length } as never)
      .eq('id', user.id)

    const rows = data as unknown as { id: string }[] | null

    return NextResponse.json({
      success: true,
      imported: rows?.length || invoices.length,
      ids: rows?.map((d) => d.id),
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
