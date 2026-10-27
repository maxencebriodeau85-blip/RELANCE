import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_EXPORT_SOURCES,
  EXPORT_MAX_PAGES,
  EXPORT_PAGE_SIZE,
  collectAccountExport,
  type ExportClient,
} from '../account-export'

type Call = { table: string; columns: string; eq: [string, string]; range: [number, number] }

function fakeClient(rowsFor: (table: string, from: number) => unknown[] | null, calls: Call[] = []): ExportClient {
  return {
    from(table: string) {
      const call = { table } as Call
      const query = {
        select(columns: string) { call.columns = columns; return query },
        eq(column: string, value: string) { call.eq = [column, value]; return query },
        order() { return query },
        range(from: number, to: number) {
          call.range = [from, to]
          calls.push(call)
          const data = rowsFor(table, from)
          return Promise.resolve(data ? { data, error: null } : { data: null, error: { message: 'offline' } })
        },
      }
      return query
    },
  } as unknown as ExportClient
}

const user = { id: 'owner', email: 'owner@encair.test', created_at: '2026-10-01T00:00:00Z' }

describe('Export RGPD du compte', () => {
  it('lit chaque table filtrée sur le propriétaire et range les données par rubrique', async () => {
    const calls: Call[] = []
    const result = await collectAccountExport(
      fakeClient((table) => (table === 'profiles' ? [{ id: 'owner', company_name: 'A' }] : table === 'invoices' ? [{ id: 'f1' }, { id: 'f2' }] : []), calls),
      user,
      new Date('2026-10-27T12:00:00Z'),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calls).toHaveLength(ACCOUNT_EXPORT_SOURCES.length)
    for (const call of calls) expect(call.eq[1]).toBe('owner')
    expect(calls.find((c) => c.table === 'profiles')?.eq[0]).toBe('id')
    expect(result.data.format).toBe('encair-export-v1')
    expect(result.data.genere_le).toBe('2026-10-27T12:00:00.000Z')
    expect(result.data.compte).toEqual({ id: 'owner', email: 'owner@encair.test', cree_le: '2026-10-01T00:00:00Z' })
    expect(result.data.donnees.profil).toEqual({ id: 'owner', company_name: 'A' })
    expect(result.data.donnees.factures).toHaveLength(2)
    expect(result.data.donnees.relances).toEqual([])
  })

  it("n'exporte jamais de secret", () => {
    const columns = ACCOUNT_EXPORT_SOURCES.filter((s) => s.table !== 'invoices').map((s) => s.columns).join(',')
    for (const secret of ['webhook_secret', 'access_token', 'refresh_token', 'key_hash', 'config', 'stripe_', '*'])
      expect(columns).not.toContain(secret)
  })

  it('suit la pagination au-delà de 1 000 lignes', async () => {
    const calls: Call[] = []
    const result = await collectAccountExport(
      fakeClient((table, from) => (table === 'invoices' ? Array.from({ length: from === 0 ? EXPORT_PAGE_SIZE : 3 }, (_, i) => ({ id: `${from + i}` })) : []), calls),
      user,
    )
    expect(result.ok && (result.data.donnees.factures as unknown[]).length).toBe(EXPORT_PAGE_SIZE + 3)
    expect(calls.filter((c) => c.table === 'invoices').map((c) => c.range)).toEqual([[0, 999], [1000, 1999]])
  })

  it('refuse un export incomplet plutôt que de tronquer', async () => {
    const result = await collectAccountExport(
      fakeClient((table) => (table === 'invoices' ? Array.from({ length: EXPORT_PAGE_SIZE }, () => ({})) : [])),
      user,
    )
    expect(result).toEqual({ ok: false, reason: 'too_large' })
    expect(EXPORT_MAX_PAGES * EXPORT_PAGE_SIZE).toBeGreaterThanOrEqual(50000)
  })

  it('signale une lecture impossible sans rien renvoyer', async () => {
    const result = await collectAccountExport(fakeClient((table) => (table === 'reminders' ? null : [])), user)
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })
})

const route = vi.hoisted(() => ({ user: vi.fn(), rows: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: route.user },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: () => Promise.resolve(route.rows(table)),
      }
      return query
    },
  }),
}))

describe('Route GET /api/account/export', () => {
  beforeEach(() => {
    vi.resetModules()
    route.user.mockResolvedValue({ data: { user: { id: 'owner-route', email: 'o@encair.test' } } })
    route.rows.mockImplementation((table: string) => ({ data: table === 'invoices' ? [{ id: 'f1', amount: 100 }] : [], error: null }))
  })

  it('refuse un visiteur non connecté', async () => {
    route.user.mockResolvedValueOnce({ data: { user: null } })
    const { GET } = await import('@/app/api/account/export/route')
    expect((await GET()).status).toBe(401)
  })

  it('renvoie un fichier JSON à télécharger, jamais mis en cache', async () => {
    const { GET } = await import('@/app/api/account/export/route')
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="encair-mes-donnees-\d{4}-\d{2}-\d{2}\.json"$/)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = JSON.parse(await response.text())
    expect(body.donnees.factures).toEqual([{ id: 'f1', amount: 100 }])
  })

  it('répond 503 si une table est illisible', async () => {
    route.rows.mockImplementation((table: string) => (table === 'notifications' ? { data: null, error: { message: 'x' } } : { data: [], error: null }))
    const { GET } = await import('@/app/api/account/export/route')
    expect((await GET()).status).toBe(503)
  })

  it('limite à 5 exports par heure et par compte', async () => {
    route.user.mockResolvedValue({ data: { user: { id: 'owner-rate', email: null } } })
    const { GET } = await import('@/app/api/account/export/route')
    const statuses = []
    for (let i = 0; i < 6; i++) statuses.push((await GET()).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429])
  })
})
