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
    | 'email.suppressed'
  created_at: string
  data: {
    email_id: string
    to?: string[]
    subject?: string
    tags?: Record<string, string>
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
    if (typeof event?.type !== 'string' || typeof event?.data?.email_id !== 'string' || !event.data.email_id || event.data.email_id.length > 200 || !Number.isFinite(Date.parse(event.created_at))) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supported = ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed']
    if (!supported.includes(event.type)) return NextResponse.json({ ok: true, ignored: true })
    const supabase = await createAdminClient()
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const tags = event.data.tags
    const claimId = typeof tags?.reminder_id === 'string' && uuid.test(tags.reminder_id) ? tags.reminder_id : null
    const invoiceId = typeof tags?.invoice_id === 'string' && uuid.test(tags.invoice_id) ? tags.invoice_id : null
    const reminderType = typeof tags?.type === 'string' && ['email_1', 'email_2', 'email_3'].includes(tags.type) ? tags.type : null
    const { data, error } = await supabase.rpc('record_collection_email_event', {
      p_resend_id: event.data.email_id,
      p_event_type: event.type,
      p_occurred_at: new Date(event.created_at).toISOString(),
      p_claim_id: claimId,
      p_invoice_id: invoiceId,
      p_reminder_type: reminderType,
    })
    // Retryable response: acknowledging a failed write would lose the event.
    if (error) return NextResponse.json({ error: 'Événement non enregistré. Réessayez.' }, { status: 503 })
    return NextResponse.json({ ok: true, tracked: data === true })
  } catch (err) {
    console.error('Resend webhook error:', err instanceof Error ? err.name : 'unknown')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
