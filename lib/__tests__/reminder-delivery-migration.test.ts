import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
const invoice = '00000000-0000-4000-8000-000000000001'
const claim = '00000000-0000-4000-8000-000000000002'
const user = '00000000-0000-4000-8000-000000000003'
const event = (type:string,time='2026-10-15T08:00:00Z',tag:string|null=claim,email='provider-1') => db.query<{ tracked:boolean }>('select public.record_collection_email_event($1,$2,$3,$4,$5,$6) as tracked',[email,type,time,tag,invoice,'email_1'])
const row = async () => (await db.query<{status:string;resend_id:string;opened_at:Date}>('select * from reminders')).rows[0]
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create table invoices(id uuid primary key,user_id uuid,reminders_paused boolean default false,updated_at timestamptz default now());
    create table reminders(id uuid primary key,invoice_id uuid,user_id uuid,type text,status text,resend_id text,created_at timestamptz default now(),sent_at timestamptz,delivered_at timestamptz,opened_at timestamptz,clicked_at timestamptz,bounced_at timestamptz,complained_at timestamptz);
    insert into invoices(id,user_id) values('${invoice}','${user}');
    insert into reminders(id,invoice_id,user_id,type,status) values('${claim}','${invoice}','${user}','email_1','pending');
    grant usage on schema public to service_role; grant select,update on invoices,reminders to service_role;`)
  await db.exec('grant insert,update,delete on reminders to authenticated;')
  await db.exec(readFileSync('supabase/migrations/20261016071846_reminder_delivery_events.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/20261016073442_protect_reminder_history.sql','utf8'))
  await db.exec('set role service_role')
},30000)
afterAll(async()=>{await db?.close()})
describe('Signed delivery event persistence',()=>{
  it('does not attach an unrelated email to a pending claim',async()=>{
    expect((await event('email.sent',undefined,'00000000-0000-4000-8000-000000000099')).rows[0].tracked).toBe(false)
    expect((await row()).status).toBe('pending')
  })
  it('recovers a pending send from the exact claim tags',async()=>{
    expect((await event('email.delivered')).rows[0].tracked).toBe(true)
    expect(await row()).toMatchObject({status:'delivered',resend_id:'provider-1'})
  })
  it('never binds the same claim to a second provider email',async()=>{
    expect((await event('email.sent',undefined,claim,'provider-2')).rows[0].tracked).toBe(false)
  })
  it('keeps the furthest state and earliest event time when callbacks are duplicated or reordered',async()=>{
    await event('email.opened','2026-10-15T09:00:00Z',null)
    await event('email.sent','2026-10-15T07:59:59Z')
    await event('email.delivered')
    await event('email.opened','2026-10-15T10:00:00Z')
    expect((await row()).status).toBe('opened')
    expect((await row()).opened_at.toISOString()).toBe('2026-10-15T09:00:00.000Z')
  })
  it('pauses future reminders after a permanent bounce',async()=>{
    await event('email.bounced')
    expect((await db.query<{reminders_paused:boolean}>('select reminders_paused from invoices')).rows[0].reminders_paused).toBe(true)
    await event('email.delivered')
    expect((await row()).status).toBe('bounced')
  })
  it('only service_role can record provider events',async()=>{
    const sql = "select has_function_privilege($1,'public.record_collection_email_event(text,text,timestamptz,uuid,uuid,text)','EXECUTE') as allowed"
    for(const role of ['anon','authenticated']) expect((await db.query<{allowed:boolean}>(sql,[role])).rows[0].allowed).toBe(false)
    expect((await db.query<{allowed:boolean}>(sql,['service_role'])).rows[0].allowed).toBe(true)
  })
  it('prevents customers from fabricating or changing delivery history directly',async()=>{
    for(const privilege of ['INSERT','UPDATE','DELETE']) {
      expect((await db.query<{allowed:boolean}>("select has_table_privilege('authenticated','public.reminders',$1) as allowed",[privilege])).rows[0].allowed).toBe(false)
    }
    await db.exec('set role authenticated')
    await expect(db.query("insert into reminders(id,status) values(gen_random_uuid(),'sent')")).rejects.toThrow('permission denied')
    await db.exec('set role service_role')
  })
})
