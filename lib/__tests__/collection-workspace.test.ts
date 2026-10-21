import { describe, it, expect } from 'vitest'
import {
  collectionTasks,
  groupCustomers,
  loadCollectionInvoices,
  type CollectionInvoice,
  type CollectionReminder,
} from '../collection-workspace'
import type { SupabaseClient } from '@supabase/supabase-js'
const now = new Date('2026-10-18T22:30:00Z') // 19 October in Paris
const invoice = (
  patch: Partial<CollectionInvoice> = {},
): CollectionInvoice => ({
  id: 'a',
  user_id: 'owner',
  client_name: 'Client',
  client_email: null,
  client_siren: null,
  invoice_number: 'F1',
  amount: 100,
  amount_paid: 25,
  status: 'pending',
  due_date: '2026-10-01',
  promise_date: null,
  balance_checked_at: now.toISOString(),
  reminders_paused: true,
  notes: null,
  paid_at: null,
  ...patch,
})
const reminder = (
  patch: Partial<CollectionReminder> = {},
): CollectionReminder => ({
  id: 'r1',
  invoice_id: 'a',
  created_at: '2026-10-18T12:00:00Z',
  status: 'failed',
  subject: null,
  type: 'email_1',
  ...patch,
})
describe('Daily collection actions', () => {
  it('combines actions without duplicating invoices and uses Paris dates', () => {
    const result = collectionTasks(
      [invoice({ balance_checked_at: null, promise_date: '2026-10-18' })],
      [reminder()],
      now,
    )
    expect(result).toHaveLength(1)
    expect(result[0].kinds).toEqual(['email', 'balance', 'promise', 'delivery'])
  })
  it('excludes paid and zero balances and keeps today promises out of overdue', () => {
    expect(
      collectionTasks(
        [invoice({ status: 'paid' }), invoice({ amount_paid: 100 })],
        [reminder()],
        now,
      ),
    ).toEqual([])
    expect(
      collectionTasks(
        [
          invoice({
            promise_date: '2026-10-19',
            client_email: 'a@example.com',
          }),
        ],
        [],
        now,
      ),
    ).toEqual([])
  })
  it('uses the latest attempt regardless of input order and flags stale pending sends', () => {
    const success = reminder({
      id: 'r2',
      status: 'sent',
      created_at: '2026-10-18T14:00:00Z',
    })
    expect(
      collectionTasks([invoice()], [success, reminder()], now)[0].kinds,
    ).not.toContain('delivery')
    expect(
      collectionTasks([invoice()], [reminder({ status: 'pending' })], now)[0]
        .kinds,
    ).toContain('delivery')
    expect(
      collectionTasks(
        [invoice()],
        [reminder({ status: 'pending', created_at: now.toISOString() })],
        now,
      )[0].kinds,
    ).not.toContain('delivery')
  })
  it('rejects future and stale balance checks but accepts the seven-day boundary', () => {
    for (const checked of [
      null,
      'invalid',
      '2026-10-20T00:00:00Z',
      new Date(now.getTime() - 7 * 86400000 - 1).toISOString(),
    ])
      expect(
        collectionTasks([invoice({ balance_checked_at: checked })], [], now)[0]
          .kinds,
      ).toContain('balance')
    expect(
      collectionTasks(
        [
          invoice({
            balance_checked_at: new Date(
              now.getTime() - 7 * 86400000,
            ).toISOString(),
          }),
        ],
        [],
        now,
      )[0].kinds,
    ).not.toContain('balance')
  })
})
describe('Customer grouping', () => {
  it('keeps homonyms without email and different recipients separate', () => {
    expect(
      groupCustomers([
        invoice(),
        invoice({ id: 'b' }),
        invoice({ id: 'c', client_email: 'a@example.com' }),
        invoice({ id: 'd', client_email: 'b@example.com' }),
      ]),
    ).toHaveLength(4)
  })
  it('groups the same name/email or SIREN and reconciles partial payments', () => {
    const groups = groupCustomers([
      invoice({ client_email: 'A@example.com' }),
      invoice({
        id: 'b',
        client_name: ' CLIENT ',
        client_email: 'a@example.com',
        status: 'paid',
      }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ remaining: 75, paid: 125 })
    expect(
      groupCustomers([
        invoice({ client_siren: '123456789' }),
        invoice({
          id: 'b',
          client_siren: '123456789',
          client_name: 'Autre raison sociale',
        }),
      ]),
    ).toHaveLength(1)
    expect(
      groupCustomers([
        invoice({ client_siren: 'invalid' }),
        invoice({ id: 'b', client_siren: 'invalid' }),
      ]),
    ).toHaveLength(2)
  })
})
describe('Collection pagination', () => {
  it('loads beyond 1000 rows with explicit account filtering on every page', async () => {
    const rows = Array.from({ length: 1001 }, (_, n) =>
      invoice({ id: String(n).padStart(5, '0') }),
    )
    const owners: string[] = []
    const db = {
      from: () => {
        let after = ''
        const q = {
          select: () => q,
          eq: (_: string, owner: string) => {
            owners.push(owner)
            return q
          },
          order: () => q,
          limit: () => q,
          gt: (_: string, cursor: string) => {
            after = cursor
            return q
          },
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({
              data: rows.filter((r) => r.id > after).slice(0, 500),
              error: null,
            }).then(resolve),
        }
        return q
      },
    } as unknown as SupabaseClient
    expect(await loadCollectionInvoices(db, 'owner')).toHaveLength(1001)
    expect(owners).toEqual(['owner', 'owner', 'owner'])
  })
})
