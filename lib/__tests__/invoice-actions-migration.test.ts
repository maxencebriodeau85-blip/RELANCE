import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const uid = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const input = (ref: string) => ({
  client_name: 'Client',
  client_email: 'a@example.com',
  invoice_number: ref,
  amount: 100,
  due_date: '2026-12-01',
  remaining_amount: 80,
})
const importRows = (rows: unknown[]) =>
  db.query<{
    result: { imported: number; updated: number; unchanged: number }
  }>('select public.import_collection_invoices($1::jsonb) as result', [
    JSON.stringify(rows),
  ])
const action = (items: unknown[], a = 'paid') =>
  db.query('select public.apply_invoice_action($1::jsonb,$2)', [
    JSON.stringify(items),
    a,
  ])
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role;
 create schema auth; create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;
 create table profiles(id uuid primary key,plan text,email text,trial_ends_at timestamptz,stripe_customer_id text,stripe_subscription_id text,invoice_count_month int default 0);
 create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,client_name text,client_email text,invoice_number text,amount numeric(12,2),due_date date,issued_date date not null,client_address text,client_siren text,status text default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
 create table reminders(id uuid primary key default gen_random_uuid(),invoice_id uuid references invoices on delete cascade,user_id uuid,type text,channel text,status text,subject text,content text,created_at timestamptz default now());
 insert into profiles(id,plan) values('${uid}','starter'),('${other}','starter');
 set request.jwt.claim.sub='${uid}';`)
  for (const file of [
    '011_lock_profile_columns.sql',
    '012_enforce_invoice_quota.sql',
    '015_collection_workspace.sql',
    '20261014161850_harden_collection_import.sql',
    '20261015060325_invoice_import_and_actions.sql',
    '20261016171736_optional_invoice_email.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
  await db.exec(`grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
 grant select,update on profiles to authenticated; grant select,insert,update,delete on invoices to authenticated;
 alter table invoices enable row level security; create policy own on invoices to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 alter table profiles enable row level security; create policy own on profiles to authenticated using(auth.uid()=id) with check(auth.uid()=id);
 set role authenticated;`)
}, 30000)
afterAll(async () => {
  await db?.close()
})
describe('Atomic invoice updates', () => {
  it('creates once, preserves missing balances and rejects stale previews', async () => {
    expect(
      (await importRows([{ ...input('F1'), expected_updated_at: null }]))
        .rows[0].result,
    ).toEqual({ imported: 1, updated: 0, unchanged: 0 })
    const rows = await db.query<{ updated_at: string }>(
      'select updated_at from invoices where invoice_number=$1',
      ['F1'],
    )
    const existing = rows.rows[0]
    expect(
      (
        await importRows([
          {
            ...input('F1'),
            remaining_amount: undefined,
            expected_updated_at: existing.updated_at,
          },
        ])
      ).rows[0].result.unchanged,
    ).toBe(1)
    await expect(
      importRows([{ ...input('F1'), expected_updated_at: null }]),
    ).rejects.toThrow('modifiée')
    await expect(
      importRows([
        { ...input('F1'), expected_updated_at: '2020-01-01T00:00:00Z' },
      ]),
    ).rejects.toThrow('modifiée')
    expect(
      (await db.query("select amount_paid from invoices where invoice_number='F1'")).rows[0],
    ).toMatchObject({ amount_paid: '20.00' })
  })
  it('rejects duplicates and fractional cents atomically', async () => {
    await expect(importRows([input('NEW'), input('NEW')])).rejects.toThrow(
      'répétée',
    )
    await expect(
      importRows([{ ...input('DEC'), amount: 100.001 }]),
    ).rejects.toThrow()
    expect((await db.query('select id from invoices')).rows).toHaveLength(1)
  })
  it('prevents direct duplicate creation', async () => {
    await expect(
      db.exec(
        `insert into invoices(user_id,invoice_number,amount,due_date) values('${uid}',' F1 ',100,'2026-12-01')`,
      ),
    ).rejects.toThrow()
  })
  it('rolls back the entire bulk action when one version is stale', async () => {
    await importRows([input('F2')])
    const invoices = (
      await db.query<{ id: string; updated_at: string }>(
        'select id,updated_at from invoices order by id',
      )
    ).rows
    await expect(
      action([
        invoices[0],
        { ...invoices[1], updated_at: '2020-01-01T00:00:00Z' },
      ]),
    ).rejects.toThrow('changé')
    expect(
      (await db.query("select id from invoices where status='paid'")).rows,
    ).toHaveLength(0)
    await action(invoices)
    expect(
      (
        await db.query(
          "select id from invoices where status='paid' and amount_paid=amount and reminders_paused",
        )
      ).rows,
    ).toHaveLength(2)
  })
  it('does not expose another account’s invoices', async () => {
    const rows = (
      await db.query<{ id: string; updated_at: string }>(
        'select id,updated_at from invoices',
      )
    ).rows
    await db.exec(`set request.jwt.claim.sub='${other}'`)
    await expect(action(rows)).rejects.toThrow('changé')
    expect((await db.query('select id from invoices')).rows).toHaveLength(0)
    await db.exec(`set request.jwt.claim.sub='${uid}'`)
  })
  it('never grants anonymous access to bulk actions', async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon','public.apply_invoice_action(jsonb,text)','EXECUTE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false)
  })
  it('imports absent emails, fills them later and preserves addresses on email-less reimports', async () => {
    expect((await importRows([{ ...input('NO-EMAIL'), client_email: null }])).rows[0].result.imported).toBe(1)
    expect((await db.query("select client_email,reminders_paused from invoices where invoice_number='NO-EMAIL'")).rows[0]).toMatchObject({ client_email: null, reminders_paused: true })
    expect((await importRows([{ ...input('NO-EMAIL'), client_email: 'RECOVERY@EXAMPLE.COM', remaining_amount: undefined }])).rows[0].result.updated).toBe(1)
    await importRows([{ ...input('NO-EMAIL'), client_email: '', remaining_amount: 60 }])
    expect((await db.query("select client_email,amount_paid,reminders_paused from invoices where invoice_number='NO-EMAIL'")).rows[0]).toMatchObject({ client_email: 'recovery@example.com', amount_paid: '40.00', reminders_paused: true })
    await expect(importRows([{ ...input('NO-EMAIL'), client_email: 'other@example.com' }])).rejects.toThrow('autre montant ou email')
    await expect(importRows([{ ...input('INVALID-EMAIL'), client_email: 'invalid' }])).rejects.toThrow('invalide')
  })

})
