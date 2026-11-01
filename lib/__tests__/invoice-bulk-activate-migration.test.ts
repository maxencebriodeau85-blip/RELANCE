import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

let db: PGlite
const uid = '00000000-0000-4000-8000-000000000001'

const importRows = (rows: unknown[]) =>
  db.query('select public.import_collection_invoices($1::jsonb) as result', [JSON.stringify(rows)])
const action = (items: unknown[], a: string) =>
  db.query<{ result: { affected: number; skipped: number } }>(
    'select public.apply_invoice_action($1::jsonb,$2) as result',
    [JSON.stringify(items), a],
  )
const versions = async (refs: string[]) =>
  (
    await db.query<{ id: string; updated_at: string }>(
      'select id,updated_at from invoices where invoice_number = any($1::text[]) order by invoice_number',
      [refs],
    )
  ).rows
const state = async (ref: string) =>
  (
    await db.query<{ reminders_paused: boolean; balance_checked_at: string | null; status: string }>(
      'select reminders_paused,balance_checked_at,status from invoices where invoice_number=$1',
      [ref],
    )
  ).rows[0]

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role;
 create schema auth; create function auth.uid() returns uuid language sql as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;
 create table profiles(id uuid primary key,plan text,email text,trial_ends_at timestamptz,stripe_customer_id text,stripe_subscription_id text,invoice_count_month int default 0);
 create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,client_name text,client_email text,invoice_number text,amount numeric(12,2),due_date date,issued_date date not null,client_address text,client_siren text,status text default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
 create table reminders(id uuid primary key default gen_random_uuid(),invoice_id uuid references invoices on delete cascade,user_id uuid,type text,channel text,status text,subject text,content text,created_at timestamptz default now());
 insert into profiles(id,plan) values('${uid}','starter');
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
  await db.exec('alter table invoices add column if not exists is_sample boolean not null default false;')
  await db.exec(readFileSync('supabase/migrations/20261101190000_bulk_activate_pause.sql', 'utf8'))
  await db.exec(`grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
 grant select,update on profiles to authenticated; grant select,insert,update,delete on invoices to authenticated;
 alter table invoices enable row level security; create policy own on invoices to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 alter table profiles enable row level security; create policy own on profiles to authenticated using(auth.uid()=id) with check(auth.uid()=id);
 set role authenticated;`)
  const row = (ref: string, extra: Record<string, unknown> = {}) => ({
    client_name: 'Client',
    client_email: 'compta@client.fr',
    invoice_number: ref,
    amount: 100,
    due_date: '2026-10-01',
    remaining_amount: 100,
    ...extra,
  })
  await importRows([
    row('OPEN'),
    row('NO-EMAIL', { client_email: null }),
    row('SETTLED', { remaining_amount: 0 }),
    row('DISPUTED'),
  ])
  const [disputed] = await versions(['DISPUTED'])
  await action([disputed], 'disputed')
}, 30000)

afterAll(async () => {
  await db?.close()
})

describe('Bulk activate and pause', () => {
  it('imports invoices paused, as before', async () => {
    expect((await state('OPEN')).reminders_paused).toBe(true)
  })

  it('activates only open invoices with a valid email and confirms their balance', async () => {
    const before = Date.now()
    const items = await versions(['OPEN', 'NO-EMAIL', 'SETTLED', 'DISPUTED'])
    const { result } = (await action(items, 'activate')).rows[0]
    expect(result).toEqual({ affected: 1, skipped: 3 })
    const open = await state('OPEN')
    expect(open.reminders_paused).toBe(false)
    expect(Date.parse(open.balance_checked_at!)).toBeGreaterThanOrEqual(before - 5000)
    for (const ref of ['NO-EMAIL', 'SETTLED', 'DISPUTED'])
      expect((await state(ref)).reminders_paused).toBe(true)
  })

  it('pauses without touching status or balance date', async () => {
    const checked = (await state('OPEN')).balance_checked_at
    const items = await versions(['OPEN'])
    expect((await action(items, 'pause')).rows[0].result).toEqual({ affected: 1, skipped: 0 })
    const open = await state('OPEN')
    expect(open).toMatchObject({ reminders_paused: true, status: 'pending' })
    expect(open.balance_checked_at).toEqual(checked)
  })

  it('rejects stale versions for the new actions too', async () => {
    const [open] = await versions(['OPEN'])
    await expect(action([{ ...open, updated_at: '2020-01-01T00:00:00Z' }], 'activate')).rejects.toThrow('changé')
    expect((await state('OPEN')).reminders_paused).toBe(true)
  })

  it('still refuses unknown actions', async () => {
    const [open] = await versions(['OPEN'])
    await expect(action([open], 'unpause_everything')).rejects.toThrow('Action invalide')
  })
})
