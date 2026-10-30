import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/reminder-service'
import { nextReminder, businessDate, reminderBlock } from '@/lib/collection'
import { getDaysOverdue } from '@/lib/metrics'
import type { Invoice, Profile } from '@/lib/database.types'
import { serviceCapabilities } from '@/lib/service-capabilities'
export const maxDuration = 60
// Best-effort trace of a blocked run; never masks the original response.
async function recordBlocked(
  reason: 'automation_not_configured' | 'claim_failed',
  client?: Awaited<ReturnType<typeof createAdminClient>>,
) {
  if (
    !client &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
    return
  try {
    const db = client ?? (await createAdminClient())
    await db.rpc('record_collection_worker_attempt', { p_reason: reason })
  } catch {}
}
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!serviceCapabilities().automationAvailable) {
    await recordBlocked('automation_not_configured')
    return NextResponse.json(
      { error: 'Service de relance non configuré.', sent: 0 },
      { status: 503 },
    )
  }
  const db = await createAdminClient()
  const { data: claim, error: claimError } = await db.rpc(
    'claim_collection_worker',
  )
  if (claimError) {
    await recordBlocked('claim_failed', db)
    return NextResponse.json(
      { error: 'Réservation du traitement impossible.' },
      { status: 503 },
    )
  }
  if (!claim) return NextResponse.json({ busy: true, sent: 0 }, { status: 202 })
  let cursor: string | null = claim.cursor_id,
    sent = 0,
    skipped = 0,
    attempted = 0,
    scanned = 0,
    failure = false
  const started = Date.now()
  try {
    let query = db
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
      .order('id')
      .limit(100)
    if (cursor) query = query.gt('id', cursor)
    const { data, error } = await query
    if (error) throw Error('INVOICE_READ_FAILED')
    const rows = (data || []) as (Invoice & { profiles: Profile })[]
    if (!rows.length) cursor = null
    let history: { invoice_id: string; type: string; created_at: string }[] = []
    if (rows.length) {
      const result = await db
        .from('reminders')
        .select('invoice_id,type,created_at')
        .in(
          'invoice_id',
          rows.map((r) => r.id),
        )
        .neq('status', 'failed')
      if (result.error) throw Error('HISTORY_READ_FAILED')
      history = result.data || []
    }
    for (const row of rows) {
      if (attempted >= 25 || Date.now() - started > 40000) break
      const previous = history.filter((r) => r.invoice_id === row.id)
      if (
        reminderBlock(row) ||
        previous.some((r) => Date.parse(r.created_at) > Date.now() - 86400000)
      ) {
        skipped++
        cursor = row.id
        scanned++
        continue
      }
      const step = nextReminder(
        getDaysOverdue(row),
        row.profiles.active_scenario,
        previous.map((r) => r.type),
      )
      if (!step) {
        skipped++
        cursor = row.id
        scanned++
        continue
      }
      attempted++
      // Checkpoint the attempted row even if dispatch rejects before returning a
      // status (for example, a database/network read). A broken account must not
      // pin every subsequent run to the same invoice. Dispatch still owns the
      // pending-send/idempotence safeguards when delivery is uncertain.
      cursor = row.id
      scanned++
      const result = await sendReminder(
        row.id,
        row.user_id,
        step.type,
        'automatic',
      )
      if (result.status === 200) sent++
      else if (result.status >= 500) throw Error('DELIVERY_FAILED')
      else skipped++
      await new Promise((resolve) => setTimeout(resolve, 550))
    }
  } catch {
    failure = true
  }
  const summary = {
    sent,
    skipped,
    attempted,
    scanned,
    ok: !failure,
    duration_ms: Date.now() - started,
  }
  const finished = await db.rpc('finish_collection_worker', {
    p_lease: claim.lease_id,
    p_cursor: cursor,
    p_result: summary,
  })
  if (finished.error || !finished.data || failure)
    return NextResponse.json(
      {
        ...summary,
        error:
          'Traitement incomplet. Consultez le suivi ; le prochain passage reprendra la progression.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
