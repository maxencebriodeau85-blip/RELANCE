import { beforeEach, describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock('@/lib/supabase/route-handler', () => ({ createRouteHandlerClient: () => ({
  supabase: { auth: { signInWithPassword: signIn } },
  applyCookies: (response: any) => { response.cookies.set('sb-test-auth-token', 'session'); return response },
}) }))
import { POST } from '../../app/api/auth/login/route'
const request = (body: unknown, origin = 'https://encair.test') => new NextRequest('https://encair.test/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body) })
beforeEach(() => { signIn.mockReset(); signIn.mockResolvedValue({ error: null }) })
describe('Login HTTP contract', () => {
  it('returns JSON with session cookies and a safe destination before navigation', async () => {
    const response = await POST(request({ email: 'test@example.com', password: 'password', redirectTo: '//evil.test' }))
    expect(response.status).toBe(200); expect(response.headers.get('set-cookie')).toContain('sb-test-auth-token=')
    expect(await response.json()).toEqual({ redirectTo: '/dashboard' })
  })
  it('rejects invalid bodies before calling the provider', async () => {
    expect((await POST(request({ email: {}, password: [] }))).status).toBe(400)
    expect(signIn).not.toHaveBeenCalled()
  })
  it('rejects cross-origin login attempts', async () => {
    expect((await POST(request({ email: 'test@example.com', password: 'password' }, 'https://evil.test'))).status).toBe(403)
    expect(signIn).not.toHaveBeenCalled()
  })
  it('reports rate limiting and outages without a misleading HTML redirect', async () => {
    signIn.mockResolvedValue({ error: { message: 'rate limit', status: 429 } })
    expect((await POST(request({ email: 'test@example.com', password: 'password' }))).status).toBe(429)
    signIn.mockRejectedValue(new Error('network'))
    expect((await POST(request({ email: 'test@example.com', password: 'password' }))).status).toBe(503)
  })
})
