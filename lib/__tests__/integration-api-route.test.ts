import { beforeEach, describe, it, expect, vi } from 'vitest'
const mock = vi.hoisted(() => ({ rpc: vi.fn(), key: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    rpc: mock.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mock.key }) }) }),
  }),
}))
import { POST, GET } from '@/app/api/v1/invoices/route'
import { validateSync } from '@/lib/integration-api'
const input = {
  source: 'ebp',
  invoices: [
    {
      external_id: '42',
      invoice_number: 'F42',
      client_name: 'Client',
      amount: 120,
      due_date: '2026-12-01',
      expected_updated_at: null,
    },
  ],
}
const req = (body: unknown = input, headers: Record<string, string> = {}) =>
  new Request('https://encair.test/api/v1/invoices', {
    method: 'POST',
    headers: {
      authorization: 'Bearer encair_' + 'a'.repeat(64),
      'idempotency-key': 'req-00001',
      ...headers,
    },
    body: JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  mock.key.mockResolvedValue({
    data: { id: 'key', user_id: 'owner', expires_at: '2099-01-01' },
    error: null,
  })
  mock.rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'consume_request_bucket' ? true : { imported: 1, invoices: [] },
    error: null,
  }))
})
describe('API v1 HTTP boundaries', () => {
  it('rejects missing credentials before accessing data', async () => {
    expect((await POST(req(input, { authorization: '' }))).status).toBe(401)
    expect(mock.key).not.toHaveBeenCalled()
  })
  it('requires idempotency and strict input without accepting account overrides', async () => {
    expect((await POST(req(input, { 'idempotency-key': '' }))).status).toBe(400)
    for (const body of [
      { ...input, user_id: 'other' },
      { ...input, invoices: [{ ...input.invoices[0], user_id: 'other' }] },
      {
        ...input,
        invoices: [{ ...input.invoices[0], expected_updated_at: undefined }],
      },
    ])
      expect((await POST(req(body))).status).toBe(422)
    expect(
      mock.rpc.mock.calls.filter((c) => c[0] === 'integration_sync'),
    ).toHaveLength(0)
  })
  it('passes only the key hash, validated rows and explicit request id', async () => {
    const response = await POST(req())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mock.rpc).toHaveBeenCalledWith(
      'integration_sync',
      expect.objectContaining({
        p_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_request_id: 'req-00001',
        p_rows: [
          expect.objectContaining({
            client_email: null,
            expected_updated_at: null,
          }),
        ],
      }),
    )
  })
  it('fails closed on distributed limiter outage or denial', async () => {
    mock.rpc.mockResolvedValueOnce({ error: { code: 'XX000' } })
    expect((await POST(req())).status).toBe(503)
    mock.rpc.mockResolvedValueOnce({ data: false })
    const r = await POST(req())
    expect(r.status).toBe(429)
    expect(r.headers.get('retry-after')).toBe('60')
  })
  it.each([
    ['40001', 409],
    ['23505', 409],
    ['23514', 403],
    ['42501', 403],
    ['28000', 401],
    ['XX000', 503],
  ])('maps database %s without exposing internals', async (code, status) => {
    mock.rpc.mockImplementation(async (n: string) =>
      n === 'consume_request_bucket'
        ? { data: true }
        : { error: { code, message: 'internal private table' } },
    )
    const r = await POST(req())
    expect(r.status).toBe(status)
    expect(await r.text()).not.toContain('private table')
  })
  it('returns a bounded page and cursor without cookies', async () => {
    mock.rpc.mockImplementation(async (n: string) => ({
      data:
        n === 'consume_request_bucket'
          ? true
          : { invoices: [{ id: 'a' }, { id: 'b' }] },
    }))
    const r = await GET(
      new Request('https://encair.test/api/v1/invoices?limit=1', {
        headers: { authorization: 'Bearer encair_' + 'a'.repeat(64) },
      }),
    )
    expect(await r.json()).toEqual({
      invoices: [{ id: 'a' }],
      next_cursor: 'a',
    })
  })
  it('rejects duplicate external IDs, fractional cents and unsupported fields', () => {
    for (const row of [
      { ...input.invoices[0], amount: 12.001 },
      { ...input.invoices[0], reminders_paused: false },
    ])
      expect(validateSync({ ...input, invoices: [row] })).toBeNull()
    expect(
      validateSync({
        ...input,
        invoices: [
          input.invoices[0],
          { ...input.invoices[0], invoice_number: 'F43' },
        ],
      }),
    ).toBeNull()
  })
})
