import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readJsonBody } from '@/lib/request-json'
import { assertActiveAccess } from '@/lib/access-control'
import { outstanding, reminderBlock } from '@/lib/collection'
import { createReminderConfirmation, reminderContent } from '@/lib/reminder-confirmation'
import type { Invoice, Profile, ReminderType } from '@/lib/database.types'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const parsed = await readJsonBody(request, 4096)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    const body = parsed.value as { type?: string } | null
    if (!['email_1', 'email_2', 'email_3'].includes(body?.type || '')) return NextResponse.json({ error: 'Choisissez une relance amiable valide.' }, { status: 422 })
    const type = body!.type as ReminderType
    const id = (await params).id
    const [inv, account, template] = await Promise.all([
      db.from('invoices').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
      db.from('profiles').select('*').eq('id', user.id).single(),
      db.from('email_template_overrides').select('subject,body,enabled').eq('user_id', user.id).eq('template_type', type).maybeSingle(),
    ])
    if (inv.error || account.error || template.error) return NextResponse.json({ error: 'Impossible de préparer l’aperçu.' }, { status: 503 })
    if (!inv.data) return NextResponse.json({ error: 'Facture introuvable.' }, { status: 404 })
    const invoice = inv.data as Invoice, profile = account.data as Profile
    const access = assertActiveAccess(profile)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const blocked = reminderBlock(invoice)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 409 })
    const content = reminderContent(invoice, profile, type, template.data)
    return NextResponse.json({ to: invoice.client_email, replyTo: profile.email, amount: outstanding(invoice), subject: content.subject, text: content.text, confirmation: createReminderConfirmation(invoice, profile, type, content) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Aperçu indisponible. Aucun message envoyé.' }, { status: 503 })
  }
}
