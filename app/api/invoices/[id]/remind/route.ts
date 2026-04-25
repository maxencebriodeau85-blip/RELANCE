import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getEmailTemplate, type EmailTemplateData } from '@/lib/email-templates'
import { getDaysOverdue } from '@/lib/metrics'
import type { ReminderType, Invoice } from '@/lib/database.types'

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

    // Get invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const inv = invoice as Invoice

    if (inv.status === 'paid') {
      return NextResponse.json({ error: 'Cette facture est déjà payée' }, { status: 400 })
    }

    // Get profile for creditor info
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, email')
      .eq('id', user.id)
      .single()

    const daysOverdue = getDaysOverdue(inv)

    const templateData: EmailTemplateData = {
      creditorName: profile?.company_name || 'Mon Entreprise',
      creditorEmail: profile?.email || user.email || '',
      clientName: inv.client_name,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      dueDate: inv.due_date,
      daysOverdue,
      invoiceId: inv.id,
    }

    const emailContent = getEmailTemplate(reminderType, templateData)

    let resendId: string | null = null
    let sendStatus: 'sent' | 'failed' = 'sent'

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${profile?.company_name || 'RelanceFlow'} <${process.env.RESEND_FROM_EMAIL || 'relances@relanceflow.fr'}>`,
          to: [inv.client_email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          replyTo: profile?.email || user.email,
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

    // Record reminder in DB
    const { error: reminderError } = await supabase.from('reminders').insert({
      invoice_id: inv.id,
      user_id: user.id,
      type: reminderType,
      channel: 'email',
      content: emailContent.html,
      subject: emailContent.subject,
      status: sendStatus,
      resend_id: resendId,
    })

    if (reminderError) {
      console.error('Reminder insert error:', reminderError)
    }

    // Update invoice status
    const newStatus =
      reminderType === 'formal_notice' ? 'formal_notice' : 'reminded'

    await supabase
      .from('invoices')
      .update({ status: newStatus })
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
