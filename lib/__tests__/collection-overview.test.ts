import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import type { CollectionOverview } from '../collection-overview'
let db: PGlite
const uid = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const overview = async () => (await db.query<{ result: CollectionOverview }>('select public.collection_overview() as result')).rows[0].result
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid,amount numeric(12,2),amount_paid numeric(12,2) default 0,status text default 'pending',due_date date,promise_date date,balance_checked_at timestamptz,reminders_paused boolean default true);
    insert into invoices(user_id,amount,due_date) select '${uid}',1.01,(now() at time zone 'Europe/Paris')::date - 10 from generate_series(1,2100);
    insert into invoices(user_id,amount,amount_paid,status,due_date,balance_checked_at,reminders_paused,promise_date) values
      ('${uid}',100,78.45,'disputed',(now() at time zone 'Europe/Paris')::date-31,now(),false,(now() at time zone 'Europe/Paris')::date),
      ('${uid}',100,100,'paid',(now() at time zone 'Europe/Paris')::date-100,now(),true,null),
      ('${other}',999999,0,'pending',(now() at time zone 'Europe/Paris')::date-1,null,true,null);
    alter table invoices enable row level security;
    create policy own on invoices to authenticated using ((select auth.uid())=user_id);
    grant usage on schema public,auth to authenticated; grant select on invoices to authenticated;`)
  await db.exec(readFileSync('supabase/migrations/20261015214719_collection_overview.sql','utf8'))
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${uid}';`)
},30000)
afterAll(async () => { await db?.close() })
describe('Collection totals with RLS', () => {
  it('includes more than 2000 invoices with exact partial balances', async () => {
    const result = await overview()
    expect(result.invoice_count).toBe(2102)
    expect(result.active_count).toBe(2101)
    expect(result.outstanding).toBe(2142.55)
    expect(result.disputed).toBe(21.55)
    expect(result.overdue_count).toBe(2101)
    expect(result.overdue).toBe(2142.55)
    expect(result.promised).toBe(21.55)
    expect(result.stale_count).toBe(2100)
    expect(result.has_verified).toBe(true)
    expect(result.priorities).toHaveLength(12)
  })
  it('reconciles the aging buckets to the full balance', async () => {
    const { aging } = await overview()
    expect(aging).toHaveLength(5)
    expect(aging[1]).toMatchObject({ count:2100, amount:2121 })
    expect(aging[2]).toMatchObject({ count:1, amount:21.55 })
    expect(aging.reduce((n,b)=>n+b.amount,0)).toBe(2142.55)
  })
  it('only returns the signed-in owner, including an empty workspace', async () => {
    await db.exec(`set request.jwt.claim.sub='${other}'`)
    expect((await overview()).outstanding).toBe(999999)
    await db.exec("set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003'")
    expect(await overview()).toMatchObject({ invoice_count:0, outstanding:0, priorities:[], has_verified:false })
  })
  it('does not grant access to anonymous requests or bypass RLS', async () => {
    expect((await db.query<{ allowed:boolean }>("select has_function_privilege('anon','public.collection_overview()','EXECUTE') as allowed")).rows[0].allowed).toBe(false)
    expect((await db.query<{ definer:boolean }>("select prosecdef as definer from pg_proc where oid='public.collection_overview()'::regprocedure")).rows[0].definer).toBe(false)
  })
})
