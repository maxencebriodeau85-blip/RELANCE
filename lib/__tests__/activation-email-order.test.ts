import { afterEach, beforeEach, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const invoice = '10000000-0000-4000-8000-000000000001'
const claim = '20000000-0000-4000-8000-000000000001'
let db: PGlite

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table profiles(id uuid primary key,created_at timestamptz default now(),plan text default 'free_trial',subscription_status text,stripe_customer_id text,stripe_subscription_id text);
    create table invoices(id uuid primary key,user_id uuid references profiles,amount numeric default 100,amount_paid numeric default 0,status text default 'pending',is_sample boolean default false,reminders_paused boolean default true,balance_checked_at timestamptz,client_email text,updated_at timestamptz default now());
    create table reminders(id uuid primary key,user_id uuid,invoice_id uuid,type text,status text,resend_id text,created_at timestamptz default now(),sent_at timestamptz,delivered_at timestamptz,opened_at timestamptz,clicked_at timestamptz,bounced_at timestamptz,complained_at timestamptz);`)
  for (const migration of [
    '20261016071846_reminder_delivery_events.sql',
    '20261016073442_protect_reminder_history.sql',
    '20261104212738_activation_metrics.sql',
    '20261106070831_activation_email_event_order.sql',
  ]) await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
  await db.exec(`insert into profiles(id) values('${owner}'),('${other}');
    insert into invoices(id,user_id) values('${invoice}','${owner}');
    insert into reminders(id,user_id,invoice_id,type,status) values('${claim}','${owner}','${invoice}','email_1','pending');
    grant usage on schema public,auth to authenticated,service_role;
    grant select,update on invoices,reminders to service_role;
    set request.jwt.claim.sub='${owner}';`)
}, 30000)
afterEach(async () => { await db?.close() })

const accepted = async () => (await db.query<{ count: number }>(
  "select count(*)::int as count from activation_events where event='first_email_accepted'",
)).rows[0].count

async function event(type: string) {
  await db.exec('set role service_role')
  try {
    await db.query('select record_collection_email_event($1,$2,now(),$3,$4,$5)',
      ['provider-fiction', type, claim, invoice, 'email_1'])
  } finally { await db.exec('reset role') }
}

it.each(['opened', 'clicked'])('counts acceptance when %s arrives before sent and delivered', async (state) => {
  await event(`email.${state}`)
  expect(await accepted()).toBe(1)
  // The sending process only updates pending claims. It must not downgrade callbacks.
  await db.exec(`update reminders set status='sent' where id='${claim}' and status='pending'`)
  await event('email.sent')
  await event('email.delivered')
  await event(`email.${state}`)
  expect((await db.query('select status from reminders')).rows).toEqual([{ status: state }])
  expect(await accepted()).toBe(1)
})

it('excludes pending, failed, samples and a reminder with a different invoice owner', async () => {
  expect(await accepted()).toBe(0)
  await event('email.failed')
  expect(await accepted()).toBe(0)
  await db.exec(`update invoices set is_sample=true;update reminders set status='opened';`)
  expect(await accepted()).toBe(0)
  await db.exec(`update invoices set is_sample=false;update reminders set user_id='${other}',status='clicked';`)
  expect(await accepted()).toBe(0)
})

it('does not let anonymous or authenticated clients fabricate provider or activation history', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    await expect(db.exec(`update reminders set status='opened'`)).rejects.toThrow('permission denied')
    await expect(db.exec(`insert into activation_events(user_id,event)values('${owner}','first_email_accepted')`)).rejects.toThrow('permission denied')
    await expect(db.exec('select record_activation_milestone()')).rejects.toThrow('permission denied')
    await expect(db.query('select record_collection_email_event($1,$2,now(),$3,$4,$5)',
      ['forged', 'email.opened', claim, invoice, 'email_1'])).rejects.toThrow('permission denied')
    await db.exec('reset role')
  }
  expect(await accepted()).toBe(0)
})
