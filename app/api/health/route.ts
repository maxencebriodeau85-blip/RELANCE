import { NextResponse } from 'next/server'

// Lightweight liveness + config probe. Used by uptime monitoring, the deploy
// pipeline, and to diagnose "I can't log in" issues: it reports WHICH required
// environment variables are present (booleans only — never their values) so a
// misconfigured Vercel deploy is obvious in one click at /api/health.
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export function GET() {
  const has = (v: string | undefined) => Boolean(v && v.length > 0)

  // The two that gate authentication entirely. If either is false, nobody can
  // log in or sign up — the login page will show a "service non configuré" error.
  const supabaseUrl = has(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const authReady = supabaseUrl && supabaseAnonKey

  return NextResponse.json({
    status: 'ok',
    service: 'relanceflow',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    timestamp: new Date().toISOString(),
    // Config presence — booleans only, no secret material is exposed.
    config: {
      authReady,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRole: has(process.env.SUPABASE_SERVICE_ROLE_KEY),
      stripeSecret: has(process.env.STRIPE_SECRET_KEY),
      stripeWebhook: has(process.env.STRIPE_WEBHOOK_SECRET),
      resend: has(process.env.RESEND_API_KEY),
      appUrl: has(process.env.NEXT_PUBLIC_APP_URL),
      // /api/cron/reminders fails closed: without CRON_SECRET it answers 401
      // BEFORE opening a DB connection. That failure is silent (Vercel does not
      // surface a 401 cron as an error) and has a non-obvious knock-on effect:
      // the daily cron is the only scheduled traffic that touches Postgres, so
      // when it 401s the database sees zero activity and a free-tier Supabase
      // project auto-pauses after ~7 days — which takes down login for
      // everyone. Surfaced here so that root cause is one click away.
      cronSecret: has(process.env.CRON_SECRET),
    },
  })
}
