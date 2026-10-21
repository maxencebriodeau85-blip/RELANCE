import { createAdminClient } from './supabase/server'
import { reminderContent, validReminderConfirmation } from './reminder-confirmation'
import { assertActiveAccess } from './access-control'
import { reminderBlock, outstanding } from './collection'
import type { Invoice, Profile, ReminderType } from './database.types'

/** Shared manual/cron dispatch; claim before sending and fail closed. */
export async function sendReminder(
  invoiceId: string,
  userId: string,
  type: ReminderType,
  source: 'manual' | 'automatic' = 'manual',
  confirmation?: string,
) {
  const db = await createAdminClient()
  const [{ data: raw, error: invoiceError }, { data: rawProfile, error: profileError }] = await Promise.all([
    db
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single(),
    db.from('profiles').select('*').eq('id', userId).single(),
  ])
  if (invoiceError || profileError) return { status: 503, error: 'Impossible de vérifier la facture et le compte. Aucun envoi.' }
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
  const content = reminderContent(invoice, profile!, type, override)
  if (source === 'manual' && !validReminderConfirmation(confirmation, invoice, profile!, type, content))
    return { status: 409, error: 'L’aperçu a expiré ou les données ont changé. Ouvrez un nouvel aperçu avant de confirmer.' }
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
  const [invoiceCheck, profileCheck, templateCheck] = await Promise.all([
    db.from('invoices').select('*').eq('id', invoiceId).eq('user_id', userId).single(),
    db.from('profiles').select('*').eq('id', userId).single(),
    db.from('email_template_overrides').select('subject,body,enabled')
      .eq('user_id', userId).eq('template_type', type).maybeSingle(),
  ])
  const cancelClaim = () => db.from('reminders').update({ status: 'failed' })
    .eq('id', claim.id).eq('user_id', userId).eq('status', 'pending')
  if (invoiceCheck.error || profileCheck.error || templateCheck.error) {
    await cancelClaim()
    return { status: 503, error: 'Impossible de vérifier les dernières données. Aucun envoi.' }
  }
  const fresh = invoiceCheck.data as Invoice | null
  const freshProfile = profileCheck.data as Profile | null
  if (
    !fresh ||
    !assertActiveAccess(freshProfile).ok ||
    (source === 'automatic' && !freshProfile?.auto_reminders) ||
    reminderBlock(fresh as Invoice) ||
    fresh.client_email !== invoice.client_email ||
    fresh.updated_at !== invoice.updated_at ||
    outstanding(fresh as Invoice) !== outstanding(invoice)
  ) {
    await cancelClaim()
    return {
      status: 409,
      error: 'La facture a changé. Vérifiez son solde avant de relancer.',
    }
  }
  // A reservation can take time: sender/template edits and confirmation expiry
  // must invalidate delivery just like a concurrent payment or recipient edit.
  const freshContent = reminderContent(fresh, freshProfile!, type, templateCheck.data)
  if (
    freshProfile!.email !== profile!.email ||
    freshProfile!.company_name !== profile!.company_name ||
    freshContent.subject !== content.subject ||
    freshContent.html !== content.html ||
    freshContent.text !== content.text ||
    (source === 'manual' && !validReminderConfirmation(confirmation, fresh, freshProfile!, type, freshContent))
  ) {
    await cancelClaim()
    return { status: 409, error: 'L’aperçu a expiré ou le message a changé. Vérifiez un nouvel aperçu avant de relancer.' }
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
