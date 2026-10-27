import { beforeEach, describe, expect, it, vi } from 'vitest'

// Deux comptes et leurs factures, filtrées comme le ferait PostgREST (RLS + filtres).
const state = vi.hoisted(() => ({
  session: 'user-a' as string | null,
  invoices: [
    { id: 'inv-a', user_id: 'user-a', invoice_number: 'A-1', client_name: 'Client A', client_email: null, amount: 100, amount_paid: 40, status: 'pending', due_date: '2026-01-01', issued_date: null, notes: null, vat_mention: '', balance_checked_at: null },
    { id: 'inv-b', user_id: 'user-b', invoice_number: 'B-1', client_name: 'Client B', client_email: null, amount: 900, amount_paid: 0, status: 'pending', due_date: '2026-01-01', issued_date: null, notes: null, vat_mention: '', balance_checked_at: null },
  ] as Record<string, unknown>[],
  filters: [] as [string, unknown][],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.session ? { id: state.session, email: `${state.session}@encair.test` } : null } }) },
    from: (table: string) => {
      const filters: [string, unknown][] = []
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => { filters.push([column, value]); state.filters.push([column, value]); return query },
        single: async () => {
          if (table === 'profiles') return { data: { company_name: 'Entreprise', address: null, postal_code: null, city: null, siren: null, email: 'x@encair.test', phone: null }, error: null }
          // RLS : seule une facture du compte connecté est visible.
          const row = state.invoices.find((i) => i.user_id === state.session && filters.every(([c, v]) => i[c] === v))
          return row ? { data: row, error: null } : { data: null, error: { code: 'PGRST116' } }
        },
      }
      return query
    },
  }),
}))

import { GET } from '@/app/api/invoices/[id]/pdf/route'
const pdf = (id: string) => GET(new Request(`https://encair.test/api/invoices/${id}/pdf`), { params: Promise.resolve({ id }) })

describe('Fiche PDF : isolement entre comptes', () => {
  beforeEach(() => {
    state.session = 'user-a'
    state.filters = []
  })

  it('refuse un visiteur non connecté', async () => {
    state.session = null
    expect((await pdf('inv-a')).status).toBe(401)
  })

  it('le compte A obtient la fiche de sa facture, jamais mise en cache', async () => {
    const response = await pdf('inv-a')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="suivi-A-1.pdf"')
  })

  it('le compte A ne peut pas obtenir la fiche d’une facture de B, même avec son identifiant', async () => {
    const response = await pdf('inv-b')
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('Client B')
  })

  it('filtre toujours sur le compte de la session, jamais sur une valeur fournie par la requête', async () => {
    await pdf('inv-a')
    expect(state.filters).toContainEqual(['user_id', 'user-a'])
  })
})
