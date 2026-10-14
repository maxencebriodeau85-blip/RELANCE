import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ getUser: vi.fn(), options: null as any }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: any) => { mock.options = options; return { auth: { getUser: mock.getUser } } } }))
import { middleware } from '../../middleware'
beforeEach(() => {
  mock.options = null; mock.getUser.mockReset(); mock.getUser.mockResolvedValue({ data: { user: null } })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'dummy')
})
describe('Session middleware', () => {
  it('preserves the full requested page after login', async () => {
    const res = await middleware(new NextRequest('https://site.test/dashboard/invoices?status=late'))
    const next = new URL(res.headers.get('location')!)
    expect(next.pathname).toBe('/auth/login'); expect(next.searchParams.get('redirectedFrom')).toBe('/dashboard/invoices?status=late')
  })
  it('returns JSON instead of HTML for unauthorized API calls', async () => {
    const res = await middleware(new NextRequest('https://site.test/api/invoices/import', { method: 'POST' }))
    expect(res.status).toBe(401); expect(res.headers.get('content-type')).toContain('application/json')
  })
  it('propagates refreshed cookies to the page request and browser', async () => {
    mock.getUser.mockImplementation(async () => { mock.options.cookies.setAll([{ name: 'sb-project-auth-token', value: 'fresh', options: { path: '/' } }]); return {} })
    const request = new NextRequest('https://site.test/dashboard', { headers: { cookie: 'sb-project-auth-token=expired' } })
    const response = await middleware(request)
    expect(request.cookies.get('sb-project-auth-token')?.value).toBe('fresh')
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('fresh')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('does not consume an email link or refresh during confirmation', async () => {
    await middleware(new NextRequest('https://site.test/auth/confirm?code=abc', { headers: { cookie: 'sb-project-auth-token=existing' } }))
    expect(mock.getUser).not.toHaveBeenCalled()
  })
})
