import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}))

// The canonical host is read once at module load, like in production.
async function load(env: Record<string, string>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return (await import('../../middleware')).middleware
}

afterEach(() => vi.unstubAllEnvs())

const live = { NEXT_PUBLIC_APP_URL: 'https://encair.fr', ENFORCE_CANONICAL_HOST: 'true', VERCEL_ENV: 'production' }

describe('Canonical host redirect', () => {
  it('moves pages from the legacy Vercel alias to encair.fr, keeping path and query', async () => {
    const middleware = await load(live)
    const res = await middleware(new NextRequest('https://relance-teal.vercel.app/guides/relance-impaye?ref=x'))
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://encair.fr/guides/relance-impaye?ref=x')
  })

  it('keeps email confirmation links working when they still point to the old host', async () => {
    const middleware = await load(live)
    const res = await middleware(new NextRequest('https://relance-teal.vercel.app/auth/confirm?token_hash=abc&type=signup'))
    expect(res.headers.get('location')).toBe('https://encair.fr/auth/confirm?token_hash=abc&type=signup')
  })

  it.each([
    '/api/cron/reminders',
    '/api/cron/trial-reminders',
    '/api/stripe/webhook',
    '/api/webhooks/resend',
    '/api/health',
    '/api/v1/invoices',
  ])('never redirects %s (cron, webhooks, monitors and API clients call fixed URLs)', async (path) => {
    const middleware = await load(live)
    const res = await middleware(new NextRequest(`https://relance-teal.vercel.app${path}`))
    expect(res.status).not.toBe(301)
    expect(res.headers.get('location')).toBeNull()
  })

  it('does nothing on the canonical host itself', async () => {
    const middleware = await load(live)
    const res = await middleware(new NextRequest('https://encair.fr/tarifs'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('stays off until explicitly enabled, and never applies to previews', async () => {
    const off = await load({ NEXT_PUBLIC_APP_URL: 'https://encair.fr', VERCEL_ENV: 'production' })
    expect((await off(new NextRequest('https://relance-teal.vercel.app/'))).headers.get('location')).toBeNull()
    const preview = await load({ ...live, VERCEL_ENV: 'preview' })
    expect((await preview(new NextRequest('https://relance-git-x.vercel.app/'))).headers.get('location')).toBeNull()
  })
})
