import { NextResponse } from 'next/server'

// Lightweight liveness probe — used by uptime monitoring and the deploy
// pipeline to confirm the build is serving requests. Does NOT touch
// Supabase or Stripe (those have their own health endpoints).
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'relanceflow',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    timestamp: new Date().toISOString(),
  })
}
