import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db:PGlite
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002'
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role authenticated;create role anon;create role service_role;
    create schema auth;create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table profiles(id uuid primary key,created_at timestamptz default now(),plan text default 'free_trial',subscription_status text,stripe_customer_id text,stripe_subscription_id text);
    create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,amount numeric,amount_paid numeric default 0,status text default 'pending',is_sample boolean default false,reminders_paused boolean default true,balance_checked_at timestamptz,client_email text);
    create table reminders(id uuid primary key default gen_random_uuid(),user_id uuid,invoice_id uuid,status text);`)
  await db.exec(readFileSync('supabase/migrations/20261104212738_activation_metrics.sql','utf8'))
  await db.exec(`insert into profiles(id,stripe_customer_id,stripe_subscription_id)values('${owner}','cus_1','sub_1'),('${other}','cus_2','sub_2');grant usage on schema public,auth to authenticated,service_role;set request.jwt.claim.sub='${owner}';`)
},30000)
afterAll(async()=>{await db?.close()})
const events=async()=> (await db.query<{event:string}>(`select event from activation_events where user_id='${owner}' order by event`)).rows.map(x=>x.event)
it('records signup, excludes examples and failed messages',async()=>{
  await db.exec(`insert into invoices(user_id,amount,is_sample,reminders_paused,balance_checked_at,client_email)values('${owner}',100,true,false,now(),'example@example.invalid');`)
  expect(await events()).toEqual(['signup'])
})
it('records only committed real milestones and deduplicates repeats',async()=>{
  await db.exec(`insert into invoices(id,user_id,amount)values('10000000-0000-4000-8000-000000000001','${owner}',100);
    update invoices set reminders_paused=false,balance_checked_at=now(),client_email='test@example.invalid' where not is_sample;
    update invoices set amount=100 where not is_sample;
    insert into reminders(user_id,invoice_id,status)values('${owner}','10000000-0000-4000-8000-000000000001','pending');`)
  expect(await events()).toEqual(['first_invoice','reminders_activated','signup'])
  await db.exec(`update reminders set status='sent';update reminders set status='delivered';`)
  expect((await events()).filter(x=>x==='first_email_accepted')).toHaveLength(1)
})
it('tracks active subscription separately from positive signed payment',async()=>{
  await db.exec(`update profiles set plan='starter',subscription_status='trialing' where id='${owner}'`)
  expect(await events()).not.toContain('subscription_active')
  await db.exec(`update profiles set subscription_status='active' where id='${owner}';
    select record_activation_payment('cus_1','sub_1',0);select record_activation_payment('cus_1','foreign-sub',1600);`)
  expect(await events()).toContain('subscription_active');expect(await events()).not.toContain('first_payment')
  await db.exec(`set role service_role;select record_activation_payment('cus_1','sub_1',1600);select record_activation_payment('cus_1','sub_1',1600);reset role;`)
  expect((await events()).filter(x=>x==='first_payment')).toHaveLength(1)
})
it('client cannot fabricate milestones, payments or read another owner',async()=>{
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}'`)
  expect((await db.query<{user_id:string}>('select user_id from activation_events')).rows.every(x=>x.user_id===owner)).toBe(true)
  await expect(db.exec(`insert into activation_events(user_id,event)values('${other}','first_payment')`)).rejects.toThrow()
  await expect(db.exec(`select record_activation_payment('cus_2','sub_2',1600)`)).rejects.toThrow()
  await db.exec('reset role')
})
it('rollback leaves no fake milestone and profile deletion cleans history',async()=>{
  await db.exec(`begin;insert into invoices(user_id,amount)values('${other}',100);rollback;`)
  expect((await db.query(`select event from activation_events where user_id='${other}'`)).rows).toEqual([{event:'signup'}])
  await db.exec(`delete from profiles where id='${other}'`)
  expect((await db.query(`select event from activation_events where user_id='${other}'`)).rows).toHaveLength(0)
})
