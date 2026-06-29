import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'

// Resend webhook events: https://resend.com/docs/dashboard/webhooks/event-types
type ResendEvent = {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.complained'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked'
    | 'email.failed'
  created_at: string
  data: {
    email_id: string
    to?: string[]
    subject?: string
    [k: string]: unknown
  }
}

// Svix webhook verification — Resend uses the Svix protocol.
// See https://docs.svix.com/receiving/verifying-payloads/how-manual
// Header format: `svix-signature: v1,<base64> v1,<base64> v2,<base64>` (space-separated)
// Signed payload: `${svix_id}.${svix_timestamp}.${rawBody}` — HMAC-SHA256, base64.
// Secret format: `whsec_<base64key>` — must decode the base64 portion.
function verifySvixSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false

  // Replay protection: reject timestamps older than 5 min
  const tsMs = Number(svixTimestamp) * 1000
  if (!Number.isFinite(tsMs)) return false
  const now = Date.now()
  if (Math.abs(now - tsMs) > 5 * 60 * 1000) return false

  // Decode the secret (drop optional whsec_ prefix, then base64-decode the key bytes)
  const secretKey = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  let keyBuf: Buffer
  try {
    keyBuf = Buffer.from(secretKey, 'base64')
  } catch {
    return false
  }

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`
  const expected = createHmac('sha256', keyBuf).update(toSign).digest('base64')

  // svix-signature can carry multiple sigs, space-separated, each "v<n>,<base64>".
  // We accept any v1 signature that matches expected.
  const candidates = svixSignature.split(' ')
  for (const cand of candidates) {
    const sep = cand.indexOf(',')
    if (sep < 0) continue
    const version = cand.slice(0, sep)
    const sig = cand.slice(sep + 1)
    if (version !== 'v1') continue
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(sig)
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    } catch {
      // continue
    }
  }
  return false
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const secret = process.env.RESEND_WEBHOOK_SECRET

    // Production hardening: never accept an unsigned webhook.
    // The previous "no secret → accept" fallback was an open-relay vulnerability
    // if the env var was forgotten.
    if (!secret) {
      console.error('RESEND_WEBHOOK_SECRET missing — refusing webhook')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const svixId = request.headers.get('svix-id') || request.headers.get('webhook-id')
    const svixTimestamp =
      request.headers.get('svix-timestamp') || request.headers.get('webhook-timestamp')
    const svixSignature =
      request.headers.get('svix-signature') || request.headers.get('webhook-signature')

    if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody) as ResendEvent
    if (!event?.type || !event?.data?.email_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const resendId = event.data.email_id
    const now = new Date().toISOString()

    // Map Resend event to (status, timestamp_column)
    let status: string | null = null
    let timestampCol: string | null = null

    switch (event.type) {
      case 'email.delivered':
        status = 'delivered'
        timestampCol = 'delivered_at'
        break
      case 'email.opened':
        status = 'opened'
        timestampCol = 'opened_at'
        break
      case 'email.clicked':
        status = 'clicked'
        timestampCol = 'clicked_at'
        break
      case 'email.bounced':
        status = 'bounced'
        timestampCol = 'bounced_at'
        break
      case 'email.complained':
        status = 'complained'
        timestampCol = 'complained_at'
        break
      case 'email.failed':
        status = 'failed'
        break
      default:
        // sent / delivery_delayed: ignore, already tracked
        return NextResponse.json({ ok: true, ignored: event.type })
    }

    // Only escalate status — never downgrade (e.g. don't overwrite "clicked" with "delivered").
    const STATUS_RANK: Record<string, number> = {
      sent: 1,
      delivered: 2,
      opened: 3,
      clicked: 4,
      bounced: 5,
      complained: 5,
      failed: 5,
    }

    const { data: current } = await supabase
      .from('reminders')
      .select('id, status')
      .eq('resend_id', resendId)
      .maybeSingle()

    if (!current) {
      // Email not tracked here (welcome email etc.) — ack but no-op.
      return NextResponse.json({ ok: true, not_tracked: true })
    }

    const currentRank = STATUS_RANK[(current as { status: string }).status] ?? 0
    const newRank = STATUS_RANK[status] ?? 0

    const update: Record<string, string> = {}
    if (newRank > currentRank) {
      update.status = status
    }
    if (timestampCol) {
      update[timestampCol] = now
    }

    if (Object.keys(update).length > 0) {
      await supabase
        .from('reminders')
        .update(update as never)
        .eq('id', (current as { id: string }).id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend webhook error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
