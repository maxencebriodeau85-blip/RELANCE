import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const userA = '00000000-0000-4000-8000-00000000000a'
const userB = '00000000-0000-4000-8000-00000000000b'
const migration = readFileSync('supabase/migrations/20261024150000_rls_initplan_fk_indexes.sql', 'utf8')
type Policy = { tablename: string; policyname: string; cmd: string; roles: string[]; qual: string | null; with_check: string | null }
// Policies de production avant migration (pg_policies, 2026-10-24) : [table, nom, commande, using, with check]
const original: [string, string, string, string | null, string | null][] = [
  ['api_keys', 'Users can delete own api keys', 'delete', 'auth.uid() = user_id', null],
  ['api_keys', 'Users can insert own api keys', 'insert', null, 'auth.uid() = user_id'],
  ['api_keys', 'Users can view own api keys', 'select', 'auth.uid() = user_id', null],
  ['contact_sequences', 'sequences_owner', 'all', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['contacts', 'contacts_owner', 'all', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['email_template_overrides', 'Users manage their own templates', 'all', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['integrations', 'Users can delete own integrations', 'delete', 'auth.uid() = user_id', null],
  ['integrations', 'Users can insert own integrations', 'insert', null, 'auth.uid() = user_id'],
  ['integrations', 'Users can update own integrations', 'update', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['integrations', 'Users can view own integrations', 'select', 'auth.uid() = user_id', null],
  ['invoices', 'Users can delete own invoices', 'delete', 'auth.uid() = user_id', null],
  ['invoices', 'Users can insert own invoices', 'insert', null, 'auth.uid() = user_id'],
  ['invoices', 'Users can update own invoices', 'update', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['invoices', 'Users can view own invoices', 'select', 'auth.uid() = user_id', null],
  ['journal_entries', 'journal_owner', 'all', 'auth.uid() = user_id', 'auth.uid() = user_id'],
  ['notifications', 'notif_read_own', 'select', 'auth.uid() = user_id', null],
  ['notifications', 'notif_update_own', 'update', 'auth.uid() = user_id', null],
  ['profiles', 'Users can update own profile', 'update', 'auth.uid() = id', null],
  ['profiles', 'Users can view own profile', 'select', 'auth.uid() = id', null],
  ['reminder_scenarios', 'Users can delete own scenarios', 'delete', 'auth.uid() = user_id', null],
  ['reminder_scenarios', 'Users can insert own scenarios', 'insert', null, '(auth.uid() = user_id) and (user_id is not null)'],
  ['reminder_scenarios', 'Users can update own scenarios', 'update', 'auth.uid() = user_id', null],
  ['reminder_scenarios', 'Users can view own and default scenarios', 'select', '(auth.uid() = user_id) or (user_id is null)', null],
  ['reminders', 'Users can view own reminders', 'select', 'auth.uid() = user_id', null],
]
const policies = async () => (await db.query<Policy>(
  "select tablename,policyname,cmd,roles::text[] as roles,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname",
)).rows
const asUser = async <T>(uid: string, sql: string) => {
  await db.exec(`set request.jwt.claim.sub='${uid}'; set role authenticated`)
  try {
    return (await db.query<T>(sql)).rows
  } finally {
    await db.exec('reset role')
  }
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table profiles(id uuid primary key, email text);
    create table contacts(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, name text);
    create table invoices(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, contact_id uuid references contacts(id) on delete set null, invoice_number text);
    create index invoices_user_id_idx on invoices(user_id);
    create table reminders(id uuid primary key default gen_random_uuid(), invoice_id uuid not null references invoices(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade);
    create table reminder_scenarios(id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, name text);
    create table integrations(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade);
    create table api_keys(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade);
    create table journal_entries(id uuid primary key default gen_random_uuid(), contact_id uuid not null references contacts(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, occurred_at timestamptz default now());
    create index journal_contact on journal_entries(contact_id, occurred_at desc);
    create table contact_sequences(id uuid primary key default gen_random_uuid(), contact_id uuid not null references contacts(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade);
    create table notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, contact_id uuid references contacts(id) on delete set null);
    create table email_template_overrides(id uuid primary key default gen_random_uuid(), user_id uuid not null);`)
  const tables = [...new Set(original.map(([table]) => table))]
  for (const table of tables) await db.exec(`alter table public.${table} enable row level security`)
  for (const [table, name, cmd, using, check] of original)
    await db.exec(`create policy "${name}" on public.${table} for ${cmd}${using ? ` using (${using})` : ''}${check ? ` with check (${check})` : ''}`)
  await db.exec(`create policy "Users cannot delete reminders" on public.reminders for delete using (false);
    grant usage on schema public, auth to authenticated; grant execute on function auth.uid() to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into profiles(id) values ('${userA}'), ('${userB}');
    insert into invoices(user_id, invoice_number) values ('${userA}', 'A-1'), ('${userA}', 'A-2'), ('${userB}', 'B-1');
    insert into reminder_scenarios(user_id, name) values ('${userA}', 'A'), ('${userB}', 'B'), (null, 'Défaut');`)
  // Appliquée deux fois : la migration doit être rejouable sans erreur.
  await db.exec(migration)
  await db.exec(migration)
}, 30000)
afterAll(async () => {
  await db?.close()
})

describe('RLS initplan and foreign key indexes migration', () => {
  it('wraps every listed auth.uid() call in a scalar subquery', async () => {
    const rows = await policies()
    for (const [table, name] of original) {
      const policy = rows.find((p) => p.tablename === table && p.policyname === name)
      expect(policy, `${table}.${name}`).toBeDefined()
      for (const expr of [policy!.qual, policy!.with_check].filter((e): e is string => e !== null)) {
        expect(expr, `${table}.${name}`).toContain('SELECT auth.uid()')
        expect(expr, `${table}.${name}`).not.toContain('auth.uid() =')
      }
    }
  })
  it('keeps commands, roles and the absence of WITH CHECK unchanged', async () => {
    const rows = await policies()
    for (const [table, name, cmd, using, check] of original) {
      const policy = rows.find((p) => p.tablename === table && p.policyname === name)!
      expect(policy.cmd, `${table}.${name}`).toBe(cmd.toUpperCase())
      expect(policy.roles, `${table}.${name}`).toEqual(['public'])
      expect(policy.qual === null, `${table}.${name} using`).toBe(using === null)
      expect(policy.with_check === null, `${table}.${name} with check`).toBe(check === null)
    }
    expect(rows.find((p) => p.policyname === 'Users cannot delete reminders')).toMatchObject({ cmd: 'DELETE', qual: 'false', with_check: null })
    expect(rows.find((p) => p.policyname === 'Users can insert own scenarios')?.with_check).toContain('user_id IS NOT NULL')
    expect(rows.find((p) => p.policyname === 'Users can view own and default scenarios')?.qual).toContain('user_id IS NULL')
  })
  it('creates the six foreign key indexes', async () => {
    const expected = {
      contact_sequences_contact_id_idx: 'contact_sequences USING btree (contact_id)',
      contact_sequences_user_id_idx: 'contact_sequences USING btree (user_id)',
      invoices_contact_id_idx: 'invoices USING btree (contact_id)',
      journal_entries_user_id_idx: 'journal_entries USING btree (user_id)',
      notifications_contact_id_idx: 'notifications USING btree (contact_id)',
      reminder_scenarios_user_id_idx: 'reminder_scenarios USING btree (user_id)',
    }
    const rows = (await db.query<{ indexname: string; indexdef: string }>(
      "select indexname,indexdef from pg_indexes where schemaname='public' and indexname = any($1)",
      [Object.keys(expected)],
    )).rows
    expect(rows).toHaveLength(6)
    for (const row of rows) expect(row.indexdef).toContain(`ON public.${expected[row.indexname as keyof typeof expected]}`)
  })
  it('keeps row isolation between accounts', async () => {
    expect((await asUser<{ invoice_number: string }>(userA, 'select invoice_number from invoices order by invoice_number')).map((r) => r.invoice_number)).toEqual(['A-1', 'A-2'])
    expect((await asUser<{ invoice_number: string }>(userB, 'select invoice_number from invoices')).map((r) => r.invoice_number)).toEqual(['B-1'])
    expect((await asUser<{ name: string }>(userA, 'select name from reminder_scenarios order by name')).map((r) => r.name)).toEqual(['A', 'Défaut'])
    await expect(asUser(userA, `insert into invoices(user_id, invoice_number) values ('${userB}', 'X')`)).rejects.toThrow('row-level security')
    await expect(asUser(userA, `insert into reminder_scenarios(user_id, name) values (null, 'X')`)).rejects.toThrow('row-level security')
    expect(await asUser(userA, "update invoices set invoice_number = 'pirate' where invoice_number = 'B-1' returning id")).toHaveLength(0)
  })
})
