import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ getUser: vi.fn(), options: null as any }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: any) => {
    mock.options = options
    return { auth: { getUser: mock.getUser } }
  },
}))
import { middleware } from '../../middleware'
beforeEach(() => {
  mock.options = null
  mock.getUser.mockReset()
  mock.getUser.mockResolvedValue({ data: { user: null } })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'dummy')
})
describe('Session middleware', () => {
  it('preserves the full requested page after login', async () => {
    const res = await middleware(
      new NextRequest('https://site.test/dashboard/invoices?status=late'),
    )
    const next = new URL(res.headers.get('location')!)
    expect(next.pathname).toBe('/auth/login')
    expect(next.searchParams.get('redirectedFrom')).toBe(
      '/dashboard/invoices?status=late',
    )
  })
  it('returns JSON instead of HTML for unauthorized API calls', async () => {
    const res = await middleware(
      new NextRequest('https://site.test/api/invoices/import', {
        method: 'POST',
      }),
    )
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
  it('propagates refreshed cookies to the page request and browser', async () => {
    mock.getUser.mockImplementation(async () => {
      mock.options.cookies.setAll([
        {
          name: 'sb-project-auth-token',
          value: 'fresh',
          options: { path: '/' },
        },
      ])
      return {}
    })
    const request = new NextRequest('https://site.test/dashboard', {
      headers: { cookie: 'sb-project-auth-token=expired' },
    })
    const response = await middleware(request)
    expect(request.cookies.get('sb-project-auth-token')?.value).toBe('fresh')
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('fresh')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('does not consume an email link or refresh during confirmation', async () => {
    await middleware(
      new NextRequest('https://site.test/auth/confirm?code=abc', {
        headers: { cookie: 'sb-project-auth-token=existing' },
      }),
    )
    expect(mock.getUser).not.toHaveBeenCalled()
  })
})

describe('Session API boundaries', () => {
  it('rejects cross-origin writes before any session refresh', async () => {
    const response = await middleware(
      new NextRequest('https://site.test/api/profile/reminders', {
        method: 'PATCH',
        headers: {
          origin: 'https://other.test',
          cookie: 'sb-project-auth-token=existing',
        },
      }),
    )
    expect(response.status).toBe(403)
    expect(mock.getUser).not.toHaveBeenCalled()
  })
  it('refreshes template sessions and prevents caching private API data', async () => {
    const response = await middleware(
      new NextRequest('https://site.test/api/email-templates', {
        headers: { cookie: 'sb-project-auth-token=existing' },
      }),
    )
    expect(mock.getUser).toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('leaves signed provider callbacks to their own authentication', async () => {
    const response = await middleware(
      new NextRequest('https://site.test/api/stripe/webhook', {
        method: 'POST',
        headers: { origin: 'https://provider.test' },
      }),
    )
    expect(response.status).toBe(200)
    expect(mock.getUser).not.toHaveBeenCalled()
  })
})

it('protects key management but permits Bearer API authentication without cookies', async () => {
  expect(
    (
      await middleware(
        new NextRequest('https://site.test/api/integrations/keys', {
          method: 'POST',
          headers: { origin: 'https://other.test' },
        }),
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await middleware(
        new NextRequest('https://site.test/api/v1/invoices', {
          method: 'POST',
        }),
      )
    ).status,
  ).toBe(200)
})
