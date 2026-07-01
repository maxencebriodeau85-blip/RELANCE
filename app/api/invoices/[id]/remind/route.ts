import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveEmailTemplate, type EmailTemplateData } from '@/lib/email-templates'
import { getDaysOverdue } from '@/lib/metrics'
import { getAppUrl } from '@/lib/app-url'
import type { ReminderType, Invoice, Profile } from '@/lib/database.types'

// Strip characters that could abuse the email From: header (header injection).
function sanitizeFromName(name: string): string {
  return name
    .replace(/[\r\n<>"]/g, '')
    .trim()
    .substring(0, 100) || 'RelanceFlow'
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const reminderType: ReminderType = body.type || 'email_1'

    // RLS ensures the invoice belongs to the authenticated user.
    const { data: invoiceData, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (invError || !invoiceData) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const inv = invoiceData as unknown as Invoice

    if (inv.status === 'paid') {
      return NextResponse.json({ error: 'Cette facture est déjà payée' }, { status: 400 })
    }
    // Never relance a disputed invoice — consistent with the cron, which
    // excludes both paid AND disputed.
    if (inv.status === 'disputed') {
      return NextResponse.json(
        { error: 'Cette facture est en litige — aucune relance ne peut être envoyée.' },
        { status: 400 }
      )
    }

    // Rate-limit: one reminder of the same type per invoice per 24 hours.
    const cooldownStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentReminder } = await supabase
      .from('reminders')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('type', reminderType)
      .eq('status', 'sent')
      .gte('created_at', cooldownStart)
      .maybeSingle()

    if (recentReminder) {
      return NextResponse.json(
        { error: 'Un email de ce type a déjà été envoyé pour cette facture dans les dernières 24h.' },
        { status: 429 }
      )
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as unknown as Profile | null

    // Check trial expiration
    if (profile?.plan === 'free_trial' && profile?.trial_ends_at) {
      if (new Date(profile.trial_ends_at) < new Date()) {
        return NextResponse.json(
          { error: "Votre période d'essai est expirée. Passez à un plan payant pour continuer." },
          { status: 403 }
        )
      }
    }

    const daysOverdue = getDaysOverdue(inv)

    const appUrl = getAppUrl()
    const paymentToken = (inv as any).payment_token as string | null
    const paymentUrl = paymentToken ? `${appUrl}/pay/${paymentToken}` : undefined

    const templateData: EmailTemplateData = {
      creditorName: profile?.company_name || 'Mon Entreprise',
      creditorEmail: profile?.email || user.email || '',
      clientName: inv.client_name,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      dueDate: inv.due_date,
      daysOverdue,
      invoiceId: inv.id,
      paymentUrl,
      description: inv.description,
      vat_mention: (inv as any).vat_mention,
    }

    // Look up user's custom template override (if any)
    const { data: overrideData } = await supabase
      .from('email_template_overrides')
      .select('subject, body, enabled')
      .eq('user_id', user.id)
      .eq('template_type', reminderType)
      .maybeSingle()

    const emailContent = resolveEmailTemplate(
      reminderType,
      templateData,
      overrideData as { subject: string; body: string; enabled: boolean } | null
    )

    let resendId: string | null = null
    let sendStatus: 'sent' | 'failed' = 'sent'

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        // Sanitize company name to prevent email header injection.
        const fromName = sanitizeFromName(profile?.company_name || 'RelanceFlow')
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'relances@relanceflow.fr'

        // Idempotency key collapses retries of the same reminder type for the
        // same invoice on the same day into a single email at Resend's level.
        const dayKey = new Date().toISOString().slice(0, 10)
        const idempotencyKey = `remind-${inv.id}-${reminderType}-${dayKey}`

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [inv.client_email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          reply_to: profile?.email || user.email,
          headers: { 'Idempotency-Key': idempotencyKey },
          tags: [
            { name: 'type', value: reminderType },
            { name: 'invoice_id', value: inv.id },
          ],
        })

        if (emailError) {
          console.error('Resend error:', emailError)
          sendStatus = 'failed'
        } else {
          resendId = emailData?.id || null
        }
      } catch (emailErr) {
        console.error('Email sending error:', emailErr)
        sendStatus = 'failed'
      }
    }

    await supabase.from('reminders').insert({
      invoice_id: inv.id,
      user_id: user.id,
      type: reminderType,
      channel: 'email',
      content: emailContent.html,
      subject: emailContent.subject,
      status: sendStatus,
      resend_id: resendId,
    } as never)

    const newStatus = reminderType === 'formal_notice' ? 'formal_notice' : 'reminded'

    await supabase
      .from('invoices')
      .update({ status: newStatus } as never)
      .eq('id', inv.id)
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      status: sendStatus,
      reminderType,
      sentTo: inv.client_email,
      subject: emailContent.subject,
      resendId,
    })
  } catch (err) {
    console.error('Remind error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
