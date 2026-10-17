import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const generate = async (uid = owner) => (await db.query<{ result: { created: number } }>('select public.generate_collection_notifications($1) as result', [uid])).rows[0].result
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create table invoices(id uuid primary key default gen_random_uuid(), user_id uuid, client_name text default 'Client', invoice_number text default 'F1', amount numeric(12,2) default 100, amount_paid numeric(12,2) default 0, status text default 'pending', due_date date default ((now() at time zone 'Europe/Paris')::date-45), promise_date date);
    create table notifications(id uuid primary key default gen_random_uuid(), user_id uuid, type text, title text, body text, action_url text, created_at timestamptz default now());
    alter table notifications enable row level security;
    alter table invoices enable row level security;
    grant usage on schema public to service_role,authenticated,anon;
    grant select,insert on all tables in schema public to service_role;
    insert into invoices(user_id,amount_paid) values ('${owner}',40),('${other}',10);
    insert into invoices(user_id,status) values ('${owner}','paid'),('${owner}','disputed');
    insert into invoices(user_id,amount_paid) values ('${owner}',100);
    insert into invoices(user_id,promise_date) values ('${owner}',(now() at time zone 'Europe/Paris')::date);
    insert into invoices(user_id,due_date) values ('${owner}',(now() at time zone 'Europe/Paris')::date-30);`)
  await db.exec(readFileSync('supabase/migrations/20261017083654_collection_notifications.sql','utf8'))
  await db.exec('set role service_role')
},30000)
afterAll(async () => { await db?.close() })
describe('Server-side collection alerts', () => {
  it('alerts only the target account and excludes settled, disputed, promised or recent invoices', async () => {
    expect(await generate()).toMatchObject({ created: 1 })
    const rows = (await db.query<{ body: string; user_id: string }>('select body,user_id from notifications')).rows
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(owner)
    expect(rows[0].body).toContain('60.00 EUR')
    expect(rows[0].body).not.toContain('mise en demeure')
  })
  it('deduplicates repeated calls, including another tab', async () => {
    expect(await generate()).toMatchObject({ created: 0 })
    expect(await generate(other)).toMatchObject({ created: 1 })
  })
  it('limits each batch and progresses past already alerted invoices', async () => {
    await db.exec(`insert into invoices(user_id) select '${owner}' from generate_series(1,105)`)
    expect(await generate()).toMatchObject({ created: 100 })
    expect(await generate()).toMatchObject({ created: 5 })
    expect(await generate()).toMatchObject({ created: 0 })
  })
  it('denies direct browser and anonymous invocation without escalating privileges', async () => {
    for (const role of ['anon','authenticated']) {
      const result = await db.query<{ allowed: boolean }>('select has_function_privilege($1,\'public.generate_collection_notifications(uuid)\',\'EXECUTE\') as allowed',[role])
      expect(result.rows[0].allowed).toBe(false)
    }
    expect((await db.query<{ definer: boolean }>("select prosecdef as definer from pg_proc where oid='public.generate_collection_notifications(uuid)'::regprocedure")).rows[0].definer).toBe(false)
  })
})
