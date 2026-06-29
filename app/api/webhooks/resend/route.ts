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

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  // Resend uses Svix-style signatures: "v1,<base64>"
  // Format: "<timestamp>.<payload>" signed with HMAC-SHA256
  const parts = signature.split(',')
  const sigPart = parts.find((p) => p.startsWith('v1,'))?.slice(3) || parts[parts.length - 1]
  if (!sigPart) return false

  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
    const a = Buffer.from(expected)
    const b = Buffer.from(sigPart)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const secret = process.env.RESEND_WEBHOOK_SECRET

    // Verify signature when secret is configured. In dev without a secret, accept.
    if (secret) {
      const signature = request.headers.get('svix-signature') || request.headers.get('resend-signature')
      if (!verifySignature(rawBody, signature, secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
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
