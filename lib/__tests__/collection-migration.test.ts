import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const uid = '00000000-0000-4000-8000-000000000001'
let db: PGlite
const row = (ref: string, remaining = 100) => ({
  client_name: 'Client',
  client_email: 'a@example.com',
  invoice_number: ref,
  amount: 100,
  due_date: '2026-10-01',
  remaining_amount: remaining,
})
const importRows = (rows: unknown[]) =>
  db.query<{
    import_collection_invoices: { imported: number; updated: number }
  }>('select import_collection_invoices($1::jsonb)', [JSON.stringify(rows)])
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role service_role; create role anon;
 create schema auth; create function auth.uid() returns uuid language sql as $$ select '${uid}'::uuid $$;
 create table profiles(id uuid primary key,plan text,email text,trial_ends_at timestamptz,stripe_customer_id text,stripe_subscription_id text,invoice_count_month int default 0);
 create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,client_name text,client_email text,invoice_number text,amount numeric(12,2),due_date date,issued_date date not null,client_address text,client_siren text,status text default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
 create table reminders(id uuid primary key default gen_random_uuid(),invoice_id uuid references invoices,user_id uuid,type text,channel text,status text,subject text,content text,created_at timestamptz default now());
 insert into profiles(id,plan,email) values('${uid}','starter','owner@example.com');`)
  await db.exec(
    readFileSync('supabase/migrations/011_lock_profile_columns.sql', 'utf8'),
  )
  await db.exec(
    readFileSync('supabase/migrations/012_enforce_invoice_quota.sql', 'utf8'),
  )
  await db.exec(
    readFileSync('supabase/migrations/015_collection_workspace.sql', 'utf8'),
  )
  await db.exec(
    'grant usage on schema public to authenticated; grant select, update on profiles to authenticated;',
  )
}, 30000)
afterAll(async () => {
  await db?.close()
})
describe('PostgreSQL collection migration', () => {
  it('imports paused records, preserves unknown issue dates, updates instead of duplicating', async () => {
    expect(
      (await importRows([row('F1')])).rows[0].import_collection_invoices,
    ).toEqual({ imported: 1, updated: 0 })
    expect(
      (await importRows([row('F1', 25)])).rows[0].import_collection_invoices,
    ).toEqual({ imported: 0, updated: 1 })
    const result = await db.query(
      "select amount_paid,issued_date,reminders_paused from invoices where invoice_number='F1'",
    )
    expect(result.rows[0]).toMatchObject({
      amount_paid: '75.00',
      issued_date: null,
      reminders_paused: true,
    })
  })
  it('rejects conflicting references atomically', async () => {
    await expect(
      importRows([row('ROLLBACK'), { ...row('F1'), amount: 200 }]),
    ).rejects.toThrow()
    expect(
      (
        await db.query(
          "select id from invoices where invoice_number='ROLLBACK'",
        )
      ).rows,
    ).toHaveLength(0)
  })
  it('prevents an authenticated user from changing their billing plan', async () => {
    await db.exec('set role authenticated')
    try {
      await expect(
        db.exec("update profiles set plan='business'"),
      ).rejects.toThrow()
    } finally {
      await db.exec('reset role')
    }
  })
  it('retains delivery claims after delivery events and blocks other types for 24h', async () => {
    const id = (
      await db.query<{ id: string }>(
        "select id from invoices where invoice_number='F1'",
      )
    ).rows[0].id
    await db.query(
      "select claim_collection_reminder($1,$2,'email_1','Hello','Body')",
      [id, uid],
    )
    await db.exec("update reminders set status='delivered'")
    await expect(
      db.query(
        "select claim_collection_reminder($1,$2,'email_2','Hello','Body')",
        [id, uid],
      ),
    ).rejects.toThrow()
    await db.exec("update reminders set created_at=now()-interval '2 days'")
    await expect(
      db.query(
        "select claim_collection_reminder($1,$2,'email_1','Hello','Body')",
        [id, uid],
      ),
    ).rejects.toThrow()
  })
  it('rejects direct inserts after trial expiry', async () => {
    await db.exec(
      "update profiles set plan='free_trial',trial_ends_at=now()-interval '1 day'",
    )
    try {
      await expect(
        db.exec(
          `insert into invoices(user_id,client_name,client_email,invoice_number,amount,due_date,issued_date) values('${uid}','C','c@example.com','EXPIRED',100,'2026-10-01','2026-09-01')`,
        ),
      ).rejects.toThrow()
    } finally {
      await db.exec("update profiles set plan='starter'")
    }
  })
  it('enforces 100 new founder invoices, while allowing balance updates at quota', async () => {
    await importRows(Array.from({ length: 99 }, (_, i) => row(`Q${i}`)))
    await expect(importRows([row('OVER')])).rejects.toThrow()
    expect(
      (await importRows([row('F1', 0)])).rows[0].import_collection_invoices
        .updated,
    ).toBe(1)
    expect(
      (
        await db.query(
          "select status,amount_paid from invoices where invoice_number='F1'",
        )
      ).rows[0],
    ).toMatchObject({ status: 'paid', amount_paid: '100.00' })
  })
})
