import { createAdminClient } from './supabase/server'
import { resolveEmailTemplate } from './email-templates'
import { assertActiveAccess } from './access-control'
import { getDaysOverdue } from './metrics'
import { reminderBlock, outstanding } from './collection'
import type { Invoice, Profile, ReminderType } from './database.types'

/** Shared manual/cron dispatch; claim before sending and fail closed. */
export async function sendReminder(
  invoiceId: string,
  userId: string,
  type: ReminderType,
  source: 'manual' | 'automatic' = 'manual',
) {
  const db = await createAdminClient()
  const [{ data: raw }, { data: rawProfile }] = await Promise.all([
    db
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single(),
    db.from('profiles').select('*').eq('id', userId).single(),
  ])
  const invoice = raw as Invoice | null
  const profile = rawProfile as Profile | null
  if (!invoice) return { status: 404, error: 'Facture introuvable.' }
  const access = assertActiveAccess(profile)
  if (!access.ok) return { status: access.status, error: access.error }
  if (source === 'automatic' && !profile?.auto_reminders)
    return { status: 409, error: 'Les relances automatiques sont désactivées.' }
  const blocked = reminderBlock(invoice)
  if (blocked) return { status: 409, error: blocked }
  if (
    !process.env.RESEND_FROM_EMAIL ||
    !process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY.includes('placeholder')
  )
    return {
      status: 503,
      error:
        'Le service email n’est pas configuré. Aucun message n’a été envoyé.',
    }
  const { data: recent, error: recentError } = await db
    .from('reminders')
    .select('id')
    .eq('invoice_id', invoiceId)
    .neq('status', 'failed')
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .limit(1)
  if (recentError)
    return {
      status: 503,
      error: 'Impossible de vérifier l’historique des envois.',
    }
  if (recent?.length)
    return {
      status: 429,
      error:
        'Une relance a déjà été préparée ou envoyée dans les dernières 24 heures.',
    }
  const { data: override, error: templateError } = await db
    .from('email_template_overrides')
    .select('subject,body,enabled')
    .eq('user_id', userId)
    .eq('template_type', type)
    .maybeSingle()
  if (templateError)
    return { status: 503, error: 'Impossible de charger le modèle.' }
  const content = resolveEmailTemplate(
    type,
    {
      creditorName: profile!.company_name || 'Votre fournisseur',
      creditorEmail: profile!.email,
      clientName: invoice.client_name,
      invoiceNumber: invoice.invoice_number,
      amount: outstanding(invoice),
      dueDate: invoice.due_date,
      daysOverdue: getDaysOverdue(invoice),
      invoiceId,
      description: invoice.description,
      vat_mention: invoice.vat_mention,
    },
    override,
  )
  const { data: claimId, error: claimError } = await db.rpc(
    'claim_collection_reminder',
    {
      p_invoice_id: invoiceId,
      p_user_id: userId,
      p_type: type,
      p_subject: content.subject,
      p_content: content.html,
    },
  )
  const claim = { id: claimId }
  if (claimError || !claimId)
    return {
      status: claimError?.code === '23505' ? 409 : 503,
      error:
        'Cette étape est déjà enregistrée ou ne peut pas être réservée. Aucun nouvel envoi.',
    }
  // Re-read just before the external side effect. Never overwrite a concurrent payment.
  const [{ data: fresh }, { data: freshProfile }] = await Promise.all([db
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', userId)
    .single(), db.from('profiles').select('auto_reminders,plan,trial_ends_at').eq('id', userId).single()])
  if (
    !fresh ||
    !assertActiveAccess(freshProfile).ok ||
    (source === 'automatic' && !freshProfile?.auto_reminders) ||
    reminderBlock(fresh as Invoice) ||
    outstanding(fresh as Invoice) !== outstanding(invoice)
  ) {
    await db.from('reminders').update({ status: 'failed' }).eq('id', claim.id)
    return {
      status: 409,
      error: 'La facture a changé. Vérifiez son solde avant de relancer.',
    }
  }
  try {
    const name = (profile!.company_name || 'Encair')
      .replace(/[\r\n<>"]/g, '')
      .slice(0, 100)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `reminder-${claim.id}`,
      },
      body: JSON.stringify({
        from: `${name} <${process.env.RESEND_FROM_EMAIL}>`,
        to: [invoice.client_email],
        reply_to: profile!.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: 'reminder_id', value: claim.id },
          { name: 'invoice_id', value: invoiceId },
          { name: 'type', value: type },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) {
      // 5xx/timeouts are ambiguous: preserve pending so a retry cannot duplicate an accepted email.
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 409
      )
        await db
          .from('reminders')
          .update({ status: 'failed' })
          .eq('id', claim.id)
      return {
        status: 502,
        error:
          'Le fournisseur email n’a pas confirmé l’envoi. Consultez l’historique avant de réessayer.',
      }
    }
    const result = (await response.json()) as { id?: string }
    if (!result.id)
      return {
        status: 502,
        error: 'Confirmation email incomplète. Envoi à vérifier.',
      }
    const { error } = await db
      .from('reminders')
      .update({
        status: 'sent',
        resend_id: result.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', claim.id)
      .eq('status', 'pending')
    if (error)
      return {
        status: 503,
        error:
          'Email accepté, mais historique à vérifier. Ne relancez pas une seconde fois.',
      }
    await db
      .from('invoices')
      .update({ status: 'reminded' })
      .eq('id', invoiceId)
      .in('status', ['pending', 'reminded'])
      .eq('amount_paid', invoice.amount_paid || 0)
    return {
      status: 200,
      success: true,
      sentTo: invoice.client_email,
      subject: content.subject,
    }
  } catch {
    return {
      status: 502,
      error:
        'L’envoi n’a pas pu être confirmé. Il reste en attente de vérification pour éviter un doublon.',
    }
  }
}
