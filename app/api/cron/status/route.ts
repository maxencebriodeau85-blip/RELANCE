import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { serviceCapabilities } from '@/lib/service-capabilities'
// Worker heartbeat for an external monitor: non-200 means the daily run is not happening.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const STALE_MS = 26 * 3600000
type Worker = {
  started_at: string | null
  completed_at: string | null
  last_result: { ok?: boolean; sent?: number } | null
  last_attempt_at: string | null
  last_blocked_reason: string | null
}
const headers = { 'Cache-Control': 'no-store' }
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers })
  const configured = serviceCapabilities().automationAvailable
  let worker: Worker | null = null,
    readable = false
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    try {
      const db = await createAdminClient()
      const { data, error } = await db
        .from('collection_worker')
        .select(
          'started_at,completed_at,last_result,last_attempt_at,last_blocked_reason',
        )
        .eq('name', 'reminders')
        .maybeSingle()
      if (!error) {
        worker = data as Worker | null
        readable = true
      }
    } catch {}
  const completed = worker?.completed_at ? Date.parse(worker.completed_at) : NaN
  const stale = !(Date.now() - completed <= STALE_MS)
  const body = {
    configured,
    last_attempt_at: worker?.last_attempt_at ?? null,
    last_blocked_reason: worker?.last_blocked_reason ?? null,
    started_at: worker?.started_at ?? null,
    completed_at: worker?.completed_at ?? null,
    last_ok: worker?.last_result?.ok ?? null,
    last_sent: worker?.last_result?.sent ?? null,
    stale,
    ...(readable ? {} : { error: 'Suivi du traitement illisible.' }),
  }
  return NextResponse.json(body, {
    // finish_collection_worker stamps completed_at even for a failed run.
    status: configured && !stale && readable && body.last_ok !== false ? 200 : 503,
    headers,
  })
}
