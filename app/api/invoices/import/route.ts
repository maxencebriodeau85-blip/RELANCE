import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { assertActiveAccess } from '@/lib/access-control'
import { isValidDate, isValidEmail } from '@/lib/validation'
export async function POST(request: Request) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (
    !Array.isArray(body?.invoices) ||
    !body.invoices.length ||
    body.invoices.length > 500
  )
    return NextResponse.json(
      { error: 'Importez entre 1 et 500 lignes.' },
      { status: 400 },
    )
  const { data: profile } = await db
    .from('profiles')
    .select('plan,trial_ends_at')
    .eq('id', user.id)
    .single()
  const access = assertActiveAccess(profile)
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status })
  const errors: string[] = []
  const refs = new Set<string>()
  const invoices = body.invoices.map(
    (row: Record<string, unknown>, index: number) => {
      const client_name = String(row?.client_name || '').trim(),
        client_email = String(row?.client_email || '')
          .trim()
          .toLowerCase(),
        invoice_number = String(row?.invoice_number || '').trim()
      const amount = Number(row?.amount),
        remaining =
          row?.remaining_amount === undefined
            ? undefined
            : Number(row.remaining_amount)
      const due_date = String(row?.due_date || ''),
        issued_date = row?.issued_date ? String(row.issued_date) : null
      if (
        !client_name ||
        client_name.length > 200 ||
        !isValidEmail(client_email) ||
        !invoice_number ||
        invoice_number.length > 50 ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > 1e7 ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 ||
        !isValidDate(due_date) ||
        (issued_date !== null &&
          (!isValidDate(issued_date) || issued_date > due_date)) ||
        (remaining !== undefined &&
          (!Number.isFinite(remaining) ||
            remaining < 0 ||
            remaining > amount ||
            Math.abs(remaining * 100 - Math.round(remaining * 100)) > 0.00001))
      )
        errors.push(`Ligne ${index + 1} : données invalides.`)
      if (refs.has(invoice_number))
        errors.push(`Ligne ${index + 1} : référence répétée dans le fichier.`)
      refs.add(invoice_number)
      return {
        client_name,
        client_email,
        invoice_number,
        amount,
        due_date,
        issued_date,
        ...(remaining !== undefined ? { remaining_amount: remaining } : {}),
        client_address: String(row?.client_address || '').slice(0, 500) || null,
        client_siren:
          String(row?.client_siren || '')
            .replace(/\D/g, '')
            .slice(0, 9) || null,
      }
    },
  )
  if (errors.length)
    return NextResponse.json(
      { error: errors.slice(0, 5).join(' ') },
      { status: 422 },
    )
  const { data, error } = await db.rpc('import_collection_invoices', {
    rows: invoices,
  })
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === '23514'
            ? 'Limite mensuelle atteinte. Les mises à jour seules restent possibles.'
            : error.code === '22023'
              ? error.message
              : 'Import impossible. Aucune ligne n’a été enregistrée.',
      },
      { status: error.code === '23514' ? 403 : 422 },
    )
  return NextResponse.json({ success: true, ...data })
}
