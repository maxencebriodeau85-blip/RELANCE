import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { readJsonBody } from '@/lib/request-json'
import { assertActiveAccess } from '@/lib/access-control'
import { MAX_IMPORT_ROWS, MAX_IMPORT_BYTES, validateInvoiceRows } from '@/lib/invoice-input'

export async function POST(request: Request) {
  try {
    const db = await createClient()
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const parsed = await readJsonBody(request, MAX_IMPORT_BYTES)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    const body = parsed.value as { invoices?: unknown[]; preview?: boolean } | null
    if (
      !Array.isArray(body?.invoices) ||
      !body.invoices.length ||
      body.invoices.length > MAX_IMPORT_ROWS
    )
      return NextResponse.json(
        { error: `Importez entre 1 et ${MAX_IMPORT_ROWS} lignes.` },
        { status: 400 },
      )
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('plan,trial_ends_at')
      .eq('id', user.id)
      .single()
    if (profileError)
      return NextResponse.json(
        { error: 'Profil momentanément indisponible.' },
        { status: 503 },
      )
    const access = assertActiveAccess(profile)
    if (!access.ok)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      )
    const { valid: invoices, errors } = validateInvoiceRows(body.invoices)
    if (errors.length)
      return NextResponse.json(
        {
          error: 'Corrigez les lignes signalées. Aucune donnée enregistrée.',
          errors,
        },
        { status: 422 },
      )

    if (body.preview === true) {
      const existing = new Map<
        string,
        {
          amount: number
          amount_paid: number
          client_email: string | null
          updated_at: string
        }
      >()
      // Keep query URLs bounded even with 500 long references.
      for (let offset = 0; offset < invoices.length; offset += 50) {
        const { data, error } = await db
          .from('invoices')
          .select('invoice_number,amount,amount_paid,client_email,updated_at')
          .eq('user_id', user.id)
          .in(
            'invoice_number',
            invoices.slice(offset, offset + 50).map((i) => i.invoice_number),
          )
        if (error)
          return NextResponse.json(
            {
              error:
                'Impossible de vérifier les factures existantes. Réessayez.',
            },
            { status: 503 },
          )
        for (const row of data || []) existing.set(row.invoice_number, row)
      }
      const conflicts: { row: number; field: string; message: string }[] = []
      const summary = { imported: 0, updated: 0, unchanged: 0 }
      const reviewed = invoices.map((row, index) => {
        const previous = existing.get(row.invoice_number)
        if (
          previous &&
          (Number(previous.amount) !== row.amount ||
            (previous.client_email && row.client_email && previous.client_email.toLowerCase() !== row.client_email))
        )
          conflicts.push({
            row: index + 2,
            field: 'invoice_number',
            message: `La référence ${row.invoice_number} existe avec un autre montant ou email.`,
          })
        if (!previous) summary.imported++
        else if (row.remaining_amount === undefined && !(!previous.client_email && row.client_email)) summary.unchanged++
        else summary.updated++
        return { ...row, client_email: row.client_email || previous?.client_email || null, expected_updated_at: previous?.updated_at ?? null }
      })
      if (conflicts.length)
        return NextResponse.json(
          {
            error: 'Des références sont en conflit. Aucune donnée enregistrée.',
            errors: conflicts,
          },
          { status: 409 },
        )
      return NextResponse.json({ invoices: reviewed, summary })
    }
    if (invoices.some((row) => !('expected_updated_at' in row)))
      return NextResponse.json(
        { error: 'Vérifiez l’aperçu avant de confirmer l’import.' },
        { status: 409 },
      )
    const { data, error } = await db.rpc('import_collection_invoices', {
      rows: invoices,
    })
    if (error) {
      const conflict = ['40001', '23505'].includes(error.code)
      return NextResponse.json(
        {
          error: conflict
            ? 'Une facture a changé depuis l’aperçu. Revenez à la correspondance pour vérifier de nouveau. Aucune ligne enregistrée.'
            : error.code === '23514'
              ? 'Quota de nouvelles factures atteint. Aucune ligne enregistrée. Un fichier contenant uniquement des mises à jour reste accepté.'
              : error.code === '22023'
                ? error.message
                : 'Import impossible. Aucune ligne enregistrée.',
        },
        {
          status: conflict
            ? 409
            : error.code === '23514' || error.code === '42501'
              ? 403
              : 422,
        },
      )
    }
    return NextResponse.json({ success: true, ...data })
  } catch {
    return NextResponse.json(
      {
        error: 'Import non confirmé. Vérifiez vos factures avant de réessayer.',
      },
      { status: 503 },
    )
  }
}
