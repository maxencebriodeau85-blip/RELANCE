import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

let db: PGlite
const owner = '00000000-0000-0000-0000-000000000001'

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role service_role bypassrls;
 create table public.profiles(id uuid primary key, plan text, stripe_customer_id text, stripe_subscription_id text,
   invoice_count_month int, trial_ends_at timestamptz, company_name text);`)
  await db.exec(readFileSync('supabase/migrations/20261027230000_subscription_status.sql', 'utf8'))
  await db.exec(`create trigger trg_protect_profile_billing before update on public.profiles
   for each row execute function public.protect_profile_billing_columns();
 grant usage on schema public to authenticated, service_role;
 grant select, update on public.profiles to authenticated, service_role;
 insert into public.profiles(id, plan, stripe_customer_id, stripe_subscription_id, company_name)
   values ('${owner}', 'starter', 'cus_1', 'sub_1', 'A');`)
}, 30000)

afterAll(async () => {
  await db?.close()
})

const asRole = async (role: string, sql: string) => {
  await db.exec(`set role ${role}`)
  try {
    return await db.exec(sql)
  } finally {
    await db.exec('reset role')
  }
}

describe('Statut Stripe de l’abonnement', () => {
  it('le serveur enregistre un paiement échoué puis son retour à la normale', async () => {
    await asRole('service_role', `update public.profiles set subscription_status = 'past_due' where id = '${owner}'`)
    expect((await db.query<{ s: string }>(`select subscription_status s from public.profiles`)).rows[0].s).toBe('past_due')
    await asRole('service_role', `update public.profiles set subscription_status = 'active' where id = '${owner}'`)
    expect((await db.query<{ s: string }>(`select subscription_status s from public.profiles`)).rows[0].s).toBe('active')
  })

  it('refuse un statut inconnu', async () => {
    await expect(db.exec(`update public.profiles set subscription_status = 'gratuit' where id = '${owner}'`)).rejects.toThrow(/subscription_status_check/)
  })

  it("un client ne peut pas effacer l'alerte lui-même, mais peut toujours modifier ses coordonnées", async () => {
    await db.exec(`update public.profiles set subscription_status = 'past_due' where id = '${owner}'`)
    await expect(asRole('authenticated', `update public.profiles set subscription_status = 'active' where id = '${owner}'`)).rejects.toThrow(/non modifiables/)
    await asRole('authenticated', `update public.profiles set company_name = 'B' where id = '${owner}'`)
    expect((await db.query<{ c: string; s: string }>(`select company_name c, subscription_status s from public.profiles`)).rows[0]).toEqual({ c: 'B', s: 'past_due' })
  })

  it('garde un search_path fixe, sans élévation de droits', async () => {
    const fn = (await db.query<{ definer: boolean; config: string[] }>(
      "select prosecdef as definer, proconfig as config from pg_proc where oid = 'public.protect_profile_billing_columns()'::regprocedure",
    )).rows[0]
    expect(fn).toEqual({ definer: false, config: ['search_path=public'] })
  })
})
