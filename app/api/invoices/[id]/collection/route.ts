import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertActiveAccess } from '@/lib/access-control'
import { isValidDate, isValidEmail } from '@/lib/validation'
import { readJsonBody } from '@/lib/request-json'
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('plan,trial_ends_at')
    .eq('id', user.id)
    .single()
  if (profileError)
    return NextResponse.json({ error: 'Impossible de vérifier votre compte. Réessayez.' }, { status: 503 })
  const access = assertActiveAccess(profile)
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status })
  const parsed = await readJsonBody(request, 16384)
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  const body = parsed.value as Record<string, unknown> | null
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ error: 'Vérifiez les données de la facture.' }, { status: 422 })
  const { id } = await params
  const { data: invoice, error: invoiceError } = await db
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (invoiceError)
    return NextResponse.json({ error: 'Impossible de charger la facture. Réessayez.' }, { status: 503 })
  if (!invoice)
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (
    !body ||
    typeof body.expected_updated_at !== 'string' ||
    !Number.isFinite(Date.parse(body.expected_updated_at)) ||
    typeof body.amount_paid !== 'number' ||
    !Number.isFinite(body.amount_paid) ||
    body.amount_paid < 0 ||
    body.amount_paid > Number(invoice.amount) ||
    Math.abs(body.amount_paid * 100 - Math.round(body.amount_paid * 100)) >
      0.00001 ||
    typeof body.reminders_paused !== 'boolean' ||
    typeof body.disputed !== 'boolean' ||
    (body.promise_date !== null &&
      (typeof body.promise_date !== 'string' ||
        !isValidDate(body.promise_date))) ||
    typeof body.notes !== 'string' ||
    body.notes.length > 4000
  )
    return NextResponse.json(
      { error: 'Vérifiez les montants, la date et les notes.' },
      { status: 422 },
    )
  const email = body.client_email
  if ('client_email' in body && email !== null && (typeof email !== 'string' || email.trim().length > 254 || (email.trim() && !isValidEmail(email.trim())))) return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 422 })
  const clientEmail = 'client_email' in body ? (typeof email === 'string' ? email.trim().toLowerCase() || null : null) : invoice.client_email
  const emailChanged = clientEmail !== invoice.client_email
  if (Date.parse(body.expected_updated_at) !== Date.parse(invoice.updated_at))
    return NextResponse.json(
      {
        error:
          'La facture a changé depuis son ouverture. Rechargez-la avant d’enregistrer.',
      },
      { status: 409 },
    )
  const status =
    body.amount_paid === Number(invoice.amount)
      ? 'paid'
      : body.disputed
        ? 'disputed'
        : invoice.status === 'paid' || invoice.status === 'disputed'
          ? 'pending'
          : invoice.status
  const { data, error } = await db
    .from('invoices')
    .update({
      amount_paid: body.amount_paid,
      client_email: clientEmail,
      status,
      promise_date: body.promise_date || null,
      reminders_paused: emailChanged || !clientEmail || body.reminders_paused,
      balance_checked_at: new Date().toISOString(),
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('updated_at', body.expected_updated_at)
    .select('id')
    .maybeSingle()
  if (error)
    return NextResponse.json(
      { error: 'Enregistrement impossible.' },
      { status: 503 },
    )
  if (!data)
    return NextResponse.json(
      { error: 'La facture vient de changer. Rechargez la page.' },
      { status: 409 },
    )
  return NextResponse.json({ success: true })
}
