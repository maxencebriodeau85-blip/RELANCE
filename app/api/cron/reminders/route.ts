import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getEmailTemplate, type EmailTemplateData } from '@/lib/email-templates'
import { getDaysOverdue } from '@/lib/metrics'
import type { Invoice, Profile, ReminderType } from '@/lib/database.types'

// Reminder schedule: days overdue → reminder type
const SCHEDULE: { days: number; type: ReminderType }[] = [
  { days: 7, type: 'email_1' },
  { days: 15, type: 'email_2' },
  { days: 30, type: 'email_2' },
  { days: 45, type: 'email_3' },
]

function sanitizeFromName(name: string): string {
  return name.replace(/[\r\n<>"]/g, '').trim().substring(0, 100) || 'RelanceFlow'
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const today = new Date()

  // Fetch all active invoices for users with auto_reminders enabled
  const { data: invoicesData, error: invError } = await supabase
    .from('invoices')
    .select(`
      *,
      profiles!inner(
        id, company_name, email, plan, trial_ends_at, auto_reminders,
        stripe_customer_id
      )
    `)
    .not('status', 'in', '("paid","disputed")')
    .lt('due_date', today.toISOString().split('T')[0])
    .eq('profiles.auto_reminders', true)

  if (invError) {
    console.error('Cron: failed to fetch invoices', invError)
    return NextResponse.json({ error: invError.message }, { status: 500 })
  }

  const invoices = (invoicesData || []) as (Invoice & { profiles: Profile })[]

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const inv of invoices) {
    const profile = inv.profiles
    if (!profile) { skipped++; continue }

    // Skip expired trials
    if (profile.plan === 'free_trial' && profile.trial_ends_at) {
      if (new Date(profile.trial_ends_at) < today) { skipped++; continue }
    }

    const daysOverdue = getDaysOverdue(inv)

    // Find the right step for today's day count
    const step = SCHEDULE.find((s) => s.days === daysOverdue)
    if (!step) { skipped++; continue }

    // Check if this reminder type was already sent for this invoice
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('type', step.type)
      .eq('status', 'sent')
      .maybeSingle()

    if (existing) { skipped++; continue }

    // Build email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relanceflow.fr'
    const paymentUrl = `${appUrl}/pay/${(inv as any).payment_token}`

    const templateData: EmailTemplateData = {
      creditorName: profile.company_name || 'Mon Entreprise',
      creditorEmail: profile.email,
      clientName: inv.client_name,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      dueDate: inv.due_date,
      daysOverdue,
      invoiceId: inv.id,
      paymentUrl,
    }

    const emailContent = getEmailTemplate(step.type, templateData)
    let resendId: string | null = null
    let sendStatus: 'sent' | 'failed' = 'sent'

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromName = sanitizeFromName(profile.company_name || 'RelanceFlow')
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'relances@relanceflow.fr'

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [inv.client_email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          reply_to: profile.email,
          tags: [
            { name: 'type', value: step.type },
            { name: 'invoice_id', value: inv.id },
            { name: 'auto', value: 'true' },
          ],
        })

        if (emailError) {
          console.error(`Cron email error for invoice ${inv.id}:`, emailError)
          sendStatus = 'failed'
          errors.push(`${inv.id}: ${emailError.message}`)
        } else {
          resendId = emailData?.id || null
          sent++
        }
      } catch (e: any) {
        sendStatus = 'failed'
        errors.push(`${inv.id}: ${e.message}`)
      }
    } else {
      // Dry run — log but count as sent
      console.log(`[DRY RUN] Would send ${step.type} to ${inv.client_email} for invoice ${inv.invoice_number}`)
      sent++
    }

    // Record the reminder
    await supabase.from('reminders').insert({
      invoice_id: inv.id,
      user_id: profile.id,
      type: step.type,
      channel: 'email',
      content: emailContent.html,
      subject: emailContent.subject,
      status: sendStatus,
      resend_id: resendId,
    } as never)

    // Update invoice status
    await supabase
      .from('invoices')
      .update({ status: 'reminded' } as never)
      .eq('id', inv.id)
  }

  console.log(`Cron reminders: sent=${sent} skipped=${skipped} errors=${errors.length}`)
  return NextResponse.json({ sent, skipped, errors })
}
