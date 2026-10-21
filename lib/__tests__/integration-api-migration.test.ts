import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const uid = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002'
const hash = 'a'.repeat(64),
  hash2 = 'b'.repeat(64)
const row = (ref = 'F1', version: string | null = null) => ({
  external_id: ref,
  invoice_number: ref,
  client_name: 'Client',
  client_email: null,
  amount: 100,
  remaining_amount: 80,
  due_date: '2026-12-01',
  expected_updated_at: version,
})
async function sync(
  rows: unknown[],
  id = 'request-0001',
  body = 'c'.repeat(64),
  key = hash,
) {
  return (
    await db.query<{ result: any }>(
      'select integration_sync($1,$2,$3,$4,$5::jsonb) as result',
      [key, id, body, 'ebp', JSON.stringify(rows)],
    )
  ).rows[0].result
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
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
    '20261018082254_integration_api_v1.sql',
    '20261018082548_collection_operations.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
  await db.exec(`grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
 grant select,update on profiles to authenticated; grant select,insert,update,delete on invoices to authenticated;
 alter table invoices enable row level security; create policy own on invoices to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 alter table profiles enable row level security; create policy own on profiles to authenticated using(auth.uid()=id) with check(auth.uid()=id);
 grant all on all tables in schema public to service_role;
 grant usage on schema public,auth to service_role;
 set role service_role;`)
}, 30000)
afterAll(async () => {
  await db?.close()
})

describe('Integration API transactions and isolation', () => {
  it('creates keys and imports without email, in pause', async () => {
    await db.exec(
      `insert into integration_keys(user_id,name,key_hash,key_prefix,scopes) values('${uid}','EBP','${hash}','encair_a',array['invoices:read','invoices:write']),('${other}','Other','${hash2}','encair_b',array['invoices:read']);`,
    )
    const result = await sync([row()])
    expect(result.imported).toBe(1)
    expect(result.invoices[0].reminders_paused).toBe(true)
  })
  it('replays without a second write and rejects a changed payload', async () => {
    expect((await sync([row()])).replayed).toBe(true)
    await expect(sync([row()], 'request-0001', 'd'.repeat(64))).rejects.toThrow(
      'IDEMPOTENCY_CONFLICT',
    )
    expect((await db.query('select * from invoices')).rows).toHaveLength(1)
  })
  it('requires matching versions and preserves an email on blank reimport', async () => {
    await expect(sync([row()], 'request-stale')).rejects.toThrow('modifiée')
    const inv = (
      await db.query<{ updated_at: string }>(
        "select updated_at from invoices where invoice_number='F1'",
      )
    ).rows[0]
    const r = await sync(
      [
        {
          ...row('F1', inv.updated_at),
          client_email: 'client@example.com',
          remaining_amount: 40,
        },
      ],
      'request-pay1',
    )
    expect(r.invoices[0].remaining_amount).toBe(40)
    const next = await sync(
      [{ ...row('F1', r.invoices[0].updated_at), remaining_amount: 0 }],
      'request-pay2',
    )
    expect(next.invoices[0].remaining_amount).toBe(0)
    expect(
      (
        await db.query(
          "select client_email,status from invoices where invoice_number='F1'",
        )
      ).rows[0],
    ).toMatchObject({ client_email: 'client@example.com', status: 'paid' })
  })
  it('never reactivates a paid invoice when a later correction increases the balance', async () => {
    await db.exec(
      "update invoices set reminders_paused=false where invoice_number='F1'",
    )
    const inv = (
      await db.query<{ updated_at: string }>(
        "select updated_at from invoices where invoice_number='F1'",
      )
    ).rows[0]
    expect(
      (await sync([row('F1', inv.updated_at)], 'request-reopen')).invoices[0]
        .reminders_paused,
    ).toBe(true)
  })
  it('isolates read access and enforces scopes', async () => {
    expect(
      (
        await db.query<{ result: any }>(
          'select integration_list($1) as result',
          [hash2],
        )
      ).rows[0].result.invoices,
    ).toEqual([])
    await expect(
      sync([row('OTHER')], 'request-other', 'e'.repeat(64), hash2),
    ).rejects.toThrow('SCOPE_REQUIRED')
  })
  it('rejects changing an external mapping or colliding references atomically', async () => {
    await expect(
      sync([{ ...row('NEW'), external_id: 'F1' }], 'request-remap'),
    ).rejects.toThrow('EXTERNAL_REFERENCE_CONFLICT')
    expect(
      (await db.query("select * from invoices where invoice_number='NEW'"))
        .rows,
    ).toHaveLength(0)
  })
  it('enforces quota atomically and allows balance-only updates at the limit', async () => {
    await db.exec(
      `update profiles set plan='free_trial',trial_ends_at=now()+interval '1 day' where id='${uid}'`,
    )
    await expect(
      sync(
        Array.from({ length: 10 }, (_, i) => row('Q' + i)),
        'request-quota',
      ),
    ).rejects.toThrow('Limite')
    expect((await db.query('select * from invoices')).rows).toHaveLength(1)
    await db.exec(
      `update profiles set trial_ends_at=now()-interval '1 day' where id='${uid}'`,
    )
    await expect(sync([row('EXPIRED')], 'request-expired')).rejects.toThrow(
      'actif requis',
    )
    await db.exec(`update profiles set plan='starter' where id='${uid}'`)
  })
  it('denies revoked keys including cached replay', async () => {
    await db.exec(
      `update integration_keys set revoked_at=now() where key_hash='${hash}'`,
    )
    await expect(sync([row()])).rejects.toThrow('INVALID_KEY')
  })
  it('keeps core ownership checks and denies client access to secrets', async () => {
    await db.exec('set role authenticated')
    await expect(
      db.query('select import_collection_invoices_for_owner($1,$2)', [
        other,
        JSON.stringify([row('ATTACK')]),
      ]),
    ).rejects.toThrow('Compte non autorisé')
    await expect(db.query('select * from integration_keys')).rejects.toThrow(
      'permission denied',
    )
    await expect(
      db.query('select integration_list($1)', [hash2]),
    ).rejects.toThrow('permission denied')
    await db.exec('set role service_role')
  })
  it('shares rate limits and serializes worker leases with persistent progress', async () => {
    const consume = async () =>
      (
        await db.query<{ ok: boolean }>(
          "select consume_request_bucket('test',2,60) as ok",
        )
      ).rows[0].ok
    expect(await consume()).toBe(true)
    expect(await consume()).toBe(true)
    expect(await consume()).toBe(false)
    const claim = async () =>
      (
        await db.query<{ result: any }>(
          'select claim_collection_worker() as result',
        )
      ).rows[0].result
    const first = await claim()
    expect(first.lease_id).toBeTruthy()
    expect(await claim()).toBeNull()
    expect(
      (
        await db.query<{ ok: boolean }>(
          'select finish_collection_worker($1,$2,$3) as ok',
          [first.lease_id, uid, '{"ok":true}'],
        )
      ).rows[0].ok,
    ).toBe(true)
    expect((await claim()).cursor_id).toBe(uid)
  })
})
