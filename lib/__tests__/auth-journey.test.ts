import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { safeRedirect, authDestination } from '../auth-navigation'
import { consumeAuthLink } from '../auth-link'
import { getAppUrl } from '../app-url'

describe('Authentication return paths', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2fevil.test', '/\nevil.test', '/%09/evil.test', '/auth/confirm?next=//evil.test', '/%zz'])('rejects unsafe destination %s', path => {
    expect(safeRedirect(path)).toBe('/dashboard')
  })
  it('retains the invoice and query after login', () => expect(safeRedirect('/dashboard/invoices?status=late')).toBe('/dashboard/invoices?status=late'))
  it('recovery always goes to password reset', () => expect(authDestination('recovery', 'https://evil.test')).toBe('/auth/reset-password'))
  it('preview ignores the production callback URL', () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_URL', 'encair-preview.vercel.app'); vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://production.test')
    expect(getAppUrl()).toBe('https://encair-preview.vercel.app'); vi.unstubAllEnvs()
  })
  it('does not send customers to the competing domain', () => {
    vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://relanceflow.fr'); vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'owned.vercel.app')
    expect(getAppUrl()).toBe('https://owned.vercel.app'); vi.unstubAllEnvs()
  })
})
const client = () => ({ auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }), verifyOtp: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }), setSession: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }) } })
describe('Email link consumer', () => {
  it('confirms a token hash without a browser verifier (another device)', async () => {
    const db = client()
    expect(await consumeAuthLink(db as unknown as SupabaseClient, new URL('https://site.test/auth/confirm?token_hash=abc&type=signup'))).toBe('/dashboard')
    expect(db.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' })
  })
  it('exchanges PKCE recovery exactly once and returns the reset page', async () => {
    const db = client()
    expect(await consumeAuthLink(db as unknown as SupabaseClient, new URL('https://site.test/auth/confirm?code=abc&type=recovery'))).toBe('/auth/reset-password')
    expect(db.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  })
  it('accepts a legacy recovery fragment', async () => {
    const db = client()
    expect(await consumeAuthLink(db as unknown as SupabaseClient, new URL('https://site.test/auth/confirm#access_token=a&refresh_token=r&type=recovery'))).toBe('/auth/reset-password')
  })
  it('does not mistake an unrelated logged-in session for successful confirmation', async () => {
    const db = client(); db.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'token has expired', status: 403 } })
    await expect(consumeAuthLink(db as unknown as SupabaseClient, new URL('https://site.test/auth/confirm?code=expired'))).rejects.toThrow('expiré')
  })
  it('rejects a missing token and an unsupported type', async () => {
    for (const query of ['', '?token_hash=x&type=other', '#error=access_denied']) await expect(consumeAuthLink(client() as unknown as SupabaseClient, new URL(`https://site.test/auth/confirm${query}`))).rejects.toThrow()
  })
})
