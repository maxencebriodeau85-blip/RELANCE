import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { serviceCapabilities } from '@/lib/service-capabilities'
import { getAppUrl } from '@/lib/app-url'
import { buildTrialReminderEmail, type TrialReminderRow } from '@/lib/trial-reminders'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

type Outcome = 'sent' | 'rejected' | 'unknown'

// Même règle que les autres envois : une issue inconnue (réseau, 5xx) garde la
// réservation pour ne jamais envoyer deux fois ; seul un refus définitif la libère.
async function send(row: TrialReminderRow, days: number, subject: string, text: string): Promise<Outcome> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `trial-${days}-${row.user_id}`,
      },
      body: JSON.stringify({
        from: `Encair <${process.env.RESEND_FROM_EMAIL}>`,
        to: [row.email],
        ...(process.env.SUPPORT_EMAIL?.trim() ? { reply_to: process.env.SUPPORT_EMAIL.trim() } : {}),
        subject,
        text,
      }),
    })
    const result = await response.json().catch(() => null)
    if (response.ok && result?.id) return 'sent'
    return response.status >= 400 && response.status < 500 && response.status !== 409 ? 'rejected' : 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!serviceCapabilities().emailAvailable)
    return NextResponse.json({ error: 'Messagerie non configurée.', sent: 0 }, { status: 503 })

  const db = await createAdminClient()
  const appUrl = getAppUrl()
  const totals = { sent: 0, rejected: 0, unknown: 0 }
  for (const days of [7, 1] as const) {
    const { data, error } = await db.rpc('claim_trial_reminders', { p_days: days, p_limit: 40 })
    if (error) return NextResponse.json({ error: 'Réservation impossible.', ...totals }, { status: 503 })
    for (const row of (data ?? []) as TrialReminderRow[]) {
      const { subject, text } = buildTrialReminderEmail(row, appUrl)
      const outcome = await send(row, days, subject, text)
      totals[outcome]++
      if (outcome === 'rejected') await db.rpc('release_trial_reminder', { p_user: row.user_id, p_days: days })
    }
  }
  return NextResponse.json(totals)
}
