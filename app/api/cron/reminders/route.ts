import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/reminder-service'
import { nextReminder, businessDate, reminderBlock } from '@/lib/collection'
import { getDaysOverdue } from '@/lib/metrics'
import type { Invoice, Profile } from '@/lib/database.types'
import { serviceCapabilities } from '@/lib/service-capabilities'
export const maxDuration = 60
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!serviceCapabilities().automationAvailable)
    return NextResponse.json({ error: 'Service de relance non configuré.', sent: 0 }, { status: 503 })
  const db = await createAdminClient()
  const { data, error } = await db
    .from('invoices')
    .select('*, profiles!inner(*)')
    .in('status', ['pending', 'reminded', 'formal_notice'])
    .eq('reminders_paused', false)
    .not('client_email', 'is', null)
    .gte(
      'balance_checked_at',
      new Date(Date.now() - 7 * 86400000).toISOString(),
    )
    .lt('due_date', businessDate())
    .eq('profiles.auto_reminders', true)
    .order('due_date')
    .limit(500)
  if (error)
    return NextResponse.json(
      { error: 'Chargement des relances impossible.' },
      { status: 503 },
    )
  let sent = 0,
    skipped = 0,
    attempted = 0
  const started = Date.now()
  for (const row of (data || []) as (Invoice & { profiles: Profile })[]) {
    if (attempted >= 25 || Date.now() - started > 40000) break
    if (reminderBlock(row)) {
      skipped++
      continue
    }
    const { data: history, error: historyError } = await db
      .from('reminders')
      .select('type,created_at')
      .eq('invoice_id', row.id)
      .neq('status', 'failed')
    if (
      historyError ||
      history?.some((r) => Date.parse(r.created_at) > Date.now() - 86400000)
    ) {
      skipped++
      continue
    }
    const step = nextReminder(
      getDaysOverdue(row),
      row.profiles.active_scenario,
      history?.map((r) => r.type) || [],
    )
    if (!step) {
      skipped++
      continue
    }
    attempted++
    const result = await sendReminder(row.id, row.user_id, step.type, 'automatic')
    if (result.status === 200) sent++
    else if (result.status >= 500) {
      // A failed provider/database must not be reported as a successful cron.
      return NextResponse.json({ error: result.error, sent, skipped, attempted }, { status: 503 })
    } else skipped++
    await new Promise((resolve) => setTimeout(resolve, 550))
  }
  return NextResponse.json({ sent, skipped, attempted })
}
