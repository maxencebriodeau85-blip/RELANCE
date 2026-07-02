import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ParsedInvoice } from '@/lib/csv-parser'
import type { Profile } from '@/lib/database.types'
import { isValidEmail, isValidDate } from '@/lib/validation'
import { assertActiveAccess, monthlyInvoiceCount, planLimit } from '@/lib/access-control'

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

    const body = await request.json().catch(() => null)
    const invoices = (body?.invoices ?? []) as ParsedInvoice[]

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
      .select('plan, trial_ends_at')
      .eq('id', user.id)
      .single()

    const profile = profileData as Pick<Profile, 'plan' | 'trial_ends_at'> | null

    // Trial / access gate (shared helper, fail-closed on null trial).
    const access = assertActiveAccess(profile)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    // Quota: real monthly count (never drifts), not the buggy invoice_count_month.
    const limit = planLimit(profile?.plan)
    const currentCount = await monthlyInvoiceCount(supabase, user.id)

    if (currentCount + invoices.length > limit) {
      return NextResponse.json(
        {
          error: `Limite du plan atteinte (${limit} factures/mois). Vous en avez ${currentCount} ce mois-ci ; cet import en ajouterait ${invoices.length}.`,
          limitReached: true,
        },
        { status: 403 }
      )
    }

    // ── Server-side re-validation (client parser can be bypassed via curl) ──
    const today = new Date().toISOString().split('T')[0]
    const rowErrors: string[] = []
    const toInsert = invoices.map((inv, i) => {
      const line = i + 1
      const clientName = String(inv.client_name || '').trim().slice(0, 200)
      const clientEmail = String(inv.client_email || '').trim().toLowerCase().slice(0, 200)
      const invoiceNumber = String(inv.invoice_number || '').trim().slice(0, 50)
      const amount = Number(inv.amount)
      const dueDate = String(inv.due_date || '').trim()
      const issuedDate = String(inv.issued_date || today).trim()

      if (!clientName) rowErrors.push(`Ligne ${line} : nom du client manquant`)
      if (!clientEmail || !isValidEmail(clientEmail))
        rowErrors.push(`Ligne ${line} : email invalide`)
      if (!invoiceNumber) rowErrors.push(`Ligne ${line} : numéro de facture manquant`)
      if (!Number.isFinite(amount) || amount <= 0)
        rowErrors.push(`Ligne ${line} : montant invalide (doit être > 0)`)
      else if (amount > 10_000_000) rowErrors.push(`Ligne ${line} : montant trop élevé`)
      if (!isValidDate(dueDate)) rowErrors.push(`Ligne ${line} : date d'échéance invalide`)
      if (!isValidDate(issuedDate)) rowErrors.push(`Ligne ${line} : date d'émission invalide`)

      return {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_address: String(inv.client_address || '').trim() || null,
        client_siren: String(inv.client_siren || '').replace(/\D/g, '').slice(0, 9) || null,
        invoice_number: invoiceNumber,
        amount,
        due_date: dueDate,
        issued_date: issuedDate,
        status: 'pending',
      }
    })

    if (rowErrors.length > 0) {
      return NextResponse.json(
        { error: 'Certaines lignes sont invalides', details: rowErrors.slice(0, 20) },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert(toInsert as never)
      .select('id')

    if (error) {
      console.error('Insert error:', error)
      const code = (error as { code?: string }).code
      // 23505 = unique_violation (duplicate invoice_number for this user)
      if (code === '23505') {
        return NextResponse.json(
          { error: 'Un ou plusieurs numéros de facture existent déjà.' },
          { status: 409 }
        )
      }
      // 23514 = check_violation raised by enforce_invoice_quota() — the atomic
      // DB-side safety net that catches concurrent imports racing the quota.
      if (code === '23514') {
        return NextResponse.json(
          {
            error: `Limite du plan atteinte (${limit} factures/mois).`,
            limitReached: true,
          },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: "Erreur lors de l'import" }, { status: 500 })
    }

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
