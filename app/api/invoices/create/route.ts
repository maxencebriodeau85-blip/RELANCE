import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_LIMITS } from '@/lib/metrics'
import type { Profile } from '@/lib/database.types'

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    // --- Validation ---
    const errors: Record<string, string> = {}

    const clientName = String(body.client_name || '').trim()
    if (!clientName) errors.client_name = 'Nom du client requis'
    else if (clientName.length > 200) errors.client_name = 'Nom trop long (200 car. max)'

    const clientEmail = String(body.client_email || '').trim().toLowerCase()
    if (!clientEmail) errors.client_email = 'Email requis'
    else if (!isValidEmail(clientEmail)) errors.client_email = 'Email invalide'

    const invoiceNumber = String(body.invoice_number || '').trim()
    if (!invoiceNumber) errors.invoice_number = 'Numéro de facture requis'
    else if (invoiceNumber.length > 50) errors.invoice_number = 'Numéro trop long (50 car. max)'

    const amountRaw = parseFloat(body.amount)
    if (isNaN(amountRaw) || amountRaw <= 0) errors.amount = 'Montant invalide (doit être > 0)'
    else if (amountRaw > 10_000_000) errors.amount = 'Montant trop élevé'

    const dueDate = String(body.due_date || '').trim()
    if (!dueDate) errors.due_date = "Date d'échéance requise"
    else if (!isValidDate(dueDate)) errors.due_date = "Date d'échéance invalide"

    const issuedDate = String(body.issued_date || new Date().toISOString().split('T')[0]).trim()
    if (!isValidDate(issuedDate)) errors.issued_date = "Date d'émission invalide"

    if (dueDate && issuedDate && isValidDate(dueDate) && isValidDate(issuedDate)) {
      if (new Date(dueDate) < new Date(issuedDate)) {
        errors.due_date = "L'échéance doit être après la date d'émission"
      }
    }

    const clientAddress = String(body.client_address || '').trim() || null
    const clientSiren = String(body.client_siren || '').replace(/\D/g, '').slice(0, 9) || null
    if (clientSiren && clientSiren.length !== 9) errors.client_siren = 'SIREN invalide (9 chiffres)'

    const notes = String(body.notes || '').trim().slice(0, 1000) || null

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation échouée', fields: errors }, { status: 422 })
    }

    // --- Plan limit check ---
    const { data: profileData } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, invoice_count_month')
      .eq('id', user.id)
      .single()

    const profile = profileData as Pick<Profile, 'plan' | 'trial_ends_at' | 'invoice_count_month'> | null

    if (profile?.plan === 'free_trial' && profile?.trial_ends_at) {
      if (new Date(profile.trial_ends_at) < new Date()) {
        return NextResponse.json(
          { error: "Période d'essai expirée. Passez à un plan payant." },
          { status: 403 }
        )
      }
    }

    const limit = PLAN_LIMITS[profile?.plan ?? 'free_trial'] ?? PLAN_LIMITS.free_trial
    const currentCount = profile?.invoice_count_month ?? 0

    if (currentCount >= limit) {
      return NextResponse.json(
        {
          error: `Limite du plan atteinte (${limit} factures/mois). Passez à un plan supérieur.`,
          limitReached: true,
        },
        { status: 403 }
      )
    }

    // --- Check duplicate invoice number ---
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Validation échouée', fields: { invoice_number: 'Ce numéro de facture existe déjà' } },
        { status: 422 }
      )
    }

    // --- Insert ---
    const { data: inserted, error: insertError } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_address: clientAddress,
        client_siren: clientSiren,
        invoice_number: invoiceNumber,
        amount: amountRaw,
        due_date: dueDate,
        issued_date: issuedDate,
        notes,
        status: 'pending',
      } as never)
      .select('id')
      .single()

    if (insertError) {
      console.error('Invoice insert error:', insertError)
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    // Update monthly counter
    await supabase
      .from('profiles')
      .update({ invoice_count_month: currentCount + 1 } as never)
      .eq('id', user.id)

    const row = inserted as unknown as { id: string }
    return NextResponse.json({ success: true, id: row.id }, { status: 201 })
  } catch (err) {
    console.error('Create invoice error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
