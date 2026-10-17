import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertActiveAccess } from '@/lib/access-control'
import { isValidDate, isValidEmail } from '@/lib/validation'
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
  const { data: profile } = await db
    .from('profiles')
    .select('plan,trial_ends_at')
    .eq('id', user.id)
    .single()
  const access = assertActiveAccess(profile)
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await request.json().catch(() => null)
  const { id } = await params
  const { data: invoice } = await db
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
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
  if ('client_email' in body && body.client_email !== null && (typeof body.client_email !== 'string' || body.client_email.trim().length > 254 || (body.client_email.trim() && !isValidEmail(body.client_email.trim())))) return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 422 })
  const clientEmail = 'client_email' in body ? (body.client_email?.trim().toLowerCase() || null) : invoice.client_email
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
      { status: 500 },
    )
  if (!data)
    return NextResponse.json(
      { error: 'La facture vient de changer. Rechargez la page.' },
      { status: 409 },
    )
  return NextResponse.json({ success: true })
}
