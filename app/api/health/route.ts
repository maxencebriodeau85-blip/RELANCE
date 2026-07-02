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
    },
  })
}
