import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create table public.profiles(id uuid primary key, email text, company_name text, plan text, trial_ends_at timestamptz);`)
  await db.exec(readFileSync('supabase/migrations/016_customer_onboarding.sql', 'utf8'))
  await db.exec(`create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
    grant usage on schema public to authenticated; grant select,update on public.profiles to authenticated;`)
}, 30000)
afterAll(async () => db?.close())
describe('Account initialization in PostgreSQL', () => {
  it('copies company details, grants exactly 30 days and ignores spoofed billing metadata', async () => {
    await db.query(`insert into auth.users values('00000000-0000-4000-8000-000000000001','test@example.com',$1::jsonb)`, [JSON.stringify({ company_name: '  Atelier Martin  ', terms_version: '2026-10', professional_use: true, plan: 'business' })])
    const { rows } = await db.query(`select *, round(extract(epoch from (trial_ends_at - signup_terms_recorded_at))/86400) days from profiles`)
    expect(rows[0]).toMatchObject({ company_name: 'Atelier Martin', plan: 'free_trial', signup_terms_version: '2026-10', signup_professional_use: true, days: '30' })
  })
  it('allows profile edits but refuses changing the registration snapshot', async () => {
    await db.exec('set role authenticated')
    try {
      await db.exec("update profiles set company_name='New name'")
      await expect(db.exec("update profiles set signup_terms_version='fake'")).rejects.toThrow('not editable')
    } finally { await db.exec('reset role') }
  })
})
