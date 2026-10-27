import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { assertActiveAccess } from '@/lib/access-control'
import { validateManualInvoice } from '@/lib/manual-invoice-input'
import { readJsonBody } from '@/lib/request-json'
import { PLAN_LIMITS } from '@/lib/metrics'
import type { Profile } from '@/lib/database.types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const parsed = await readJsonBody(request, 32 * 1024)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value))
      return NextResponse.json({ error: 'Objet JSON requis.' }, { status: 400 })
    const { invoice, fields } = validateManualInvoice(parsed.value as Record<string, unknown>)
    if (!invoice) return NextResponse.json({ error: 'Validation échouée', fields }, { status: 422 })

    // --- Plan limit check ---
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at')
      .eq('id', user.id)
      .single()

    if (profileError) return NextResponse.json({ error: 'Profil momentanément indisponible.' }, { status: 503 })
    const profile = profileData as Pick<Profile, 'plan' | 'trial_ends_at'> | null

    const access = assertActiveAccess(profile)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Count invoices created this calendar month (exact, never drifts)
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count: currentCount, error: countError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_sample', false)
      .gte('created_at', monthStart.toISOString())

    if (countError || currentCount === null) return NextResponse.json({ error: 'Quota momentanément indisponible.' }, { status: 503 })
    const limit = PLAN_LIMITS[profile?.plan ?? 'free_trial'] ?? PLAN_LIMITS.free_trial

    if ((currentCount ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `Limite du plan atteinte (${limit} factures/mois). Passez à un plan supérieur.`,
          limitReached: true,
        },
        { status: 403 }
      )
    }

    // --- Check duplicate invoice number ---
    const { data: existing, error: duplicateError } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .eq('invoice_number', invoice.invoice_number)
      .maybeSingle()

    if (duplicateError) return NextResponse.json({ error: 'Vérification de référence indisponible.' }, { status: 503 })
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
        ...invoice,
        reminders_paused: true,
        status: 'pending',
      } as never)
      .select('id')
      .single()

    if (insertError) {
      console.error('Invoice insert error:', insertError)
      if (insertError.code === '23505') return NextResponse.json({ error: 'Cette référence de facture existe déjà.', fields: { invoice_number: 'Référence déjà utilisée' } }, { status: 409 })
      // 23514 = check_violation raised by enforce_invoice_quota() — the atomic
      // DB-side safety net for concurrent creates racing the quota.
      if ((insertError as { code?: string }).code === '23514') {
        return NextResponse.json(
          {
            error: `Limite du plan atteinte (${limit} factures/mois). Passez à un plan supérieur.`,
            limitReached: true,
          },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    // The monthly usage is derived from a live COUNT of invoices (see
    // monthlyInvoiceCount / the dashboard), so there's no counter to bump here.
    // profiles.invoice_count_month is intentionally not updated — it is locked
    // for the authenticated role by migration 011 and no longer authoritative.

    if (!inserted) return NextResponse.json({ error: 'Création non confirmée. Vérifiez la liste avant de réessayer.' }, { status: 503 })
    const row = inserted as unknown as { id: string }
    return NextResponse.json({ success: true, id: row.id }, { status: 201 })
  } catch (err) {
    console.error('Create invoice error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
