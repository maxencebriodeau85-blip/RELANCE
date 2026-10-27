import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { reminderBlock } from '../collection'
import type { Invoice } from '../database.types'

// ---------- Règle applicative
describe('Relance sur une facture d’exemple', () => {
  it('est toujours bloquée, avant toute autre règle', () => {
    const invoice = {
      id: 'x', amount: 100, amount_paid: 0, status: 'pending', due_date: '2026-01-01', client_email: 'a@b.fr',
      reminders_paused: false, balance_checked_at: new Date().toISOString(), is_sample: true,
    } as unknown as Invoice
    expect(reminderBlock(invoice)).toMatch(/Facture d’exemple/)
    expect(reminderBlock({ ...invoice, is_sample: false })).toBeNull()
  })
})

// ---------- Migration (PGlite)
let db: PGlite
const trial = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const expired = '00000000-0000-4000-8000-000000000003'
const as = async (uid: string) => {
  await db.exec(`reset role; set request.jwt.claim.sub='${uid}'; set role authenticated;`)
}
const fail = async (sql: string) => {
  try {
    await db.exec(sql)
    return null
  } catch (e) {
    return (e as Error).message
  }
}
const count = async (where: string) =>
  Number((await db.query<{ n: number }>(`select count(*)::int n from invoices where ${where}`)).rows[0].n)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role;
 create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table profiles(id uuid primary key,plan text,email text,trial_ends_at timestamptz,stripe_customer_id text,stripe_subscription_id text,invoice_count_month int default 0);
 create table invoices(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,client_name text,client_email text,invoice_number text,amount numeric(12,2),due_date date,issued_date date not null,client_address text,client_siren text,status text default 'pending',created_at timestamptz default now(),updated_at timestamptz default now());
 create table reminders(id uuid primary key default gen_random_uuid(),invoice_id uuid references invoices on delete cascade,user_id uuid,type text,channel text,status text,subject text,content text,created_at timestamptz default now());
 create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid,type text,title text,body text,action_url text,created_at timestamptz default now());
 insert into profiles(id,plan,trial_ends_at) values('${trial}','free_trial',now()+interval '20 days'),('${other}','free_trial',now()+interval '20 days'),('${expired}','free_trial',now()-interval '1 day');`)
  for (const file of [
    '011_lock_profile_columns.sql',
    '012_enforce_invoice_quota.sql',
    '015_collection_workspace.sql',
    '20261014161850_harden_collection_import.sql',
    '20261015060325_invoice_import_and_actions.sql',
    '20261016171736_optional_invoice_email.sql',
    '20261027235000_sample_invoices.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
  await db.exec(`grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
 grant select,update on profiles to authenticated; grant select,insert,update,delete on invoices to authenticated;
 grant select on reminders, notifications to authenticated;
 alter table invoices enable row level security; create policy own on invoices to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 alter table profiles enable row level security; create policy own on profiles to authenticated using(auth.uid()=id) with check(auth.uid()=id);`)
}, 30000)
afterAll(async () => {
  await db?.close()
})

describe('Factures d’exemple (migration)', () => {
  it('crée cinq exemples dans un espace vide, avec les cas utiles à la démonstration', async () => {
    await as(trial)
    const r = await db.query<{ r: { created: number } }>('select public.create_sample_invoices() r')
    expect(r.rows[0].r).toEqual({ created: 5 })
    expect(await count(`is_sample`)).toBe(5)
    const rows = (await db.query<{ invoice_number: string; status: string; amount_paid: string; reminders_paused: boolean; client_email: string | null }>(
      `select invoice_number,status,amount_paid,reminders_paused,client_email from invoices order by invoice_number`)).rows
    expect(rows.map((x) => x.status)).toEqual(['pending', 'pending', 'disputed', 'pending', 'paid'])
    expect(rows[0]).toMatchObject({ amount_paid: '506.51', reminders_paused: false })
    expect(rows[3].client_email).toBeNull()
    for (const row of rows) if (row.client_email) expect(row.client_email).toMatch(/\.invalid$/)
  })

  it('une seule fois, et seulement dans un espace vide', async () => {
    await as(trial)
    expect(await fail('select public.create_sample_invoices()')).toMatch(/espace vide/)
  })

  it('les exemples ne consomment pas le quota d’essai (10 vraies factures restent possibles)', async () => {
    await as(trial)
    const rows = Array.from({ length: 10 }, (_, i) => ({ invoice_number: `R-${i}`, client_name: 'Client', client_email: 'a@b.fr', amount: 100, due_date: '2026-12-01' }))
    await db.query('select public.import_collection_invoices($1::jsonb)', [JSON.stringify(rows)])
    expect(await count(`not is_sample`)).toBe(10)
    expect(await fail(`select public.import_collection_invoices('[{"invoice_number":"R-11","client_name":"C","amount":1,"due_date":"2026-12-01"}]'::jsonb)`)).toMatch(/Limite mensuelle de 10/)
  })

  it('un client ne peut ni fabriquer un exemple, ni transformer une vraie facture en exemple, ni l’inverse', async () => {
    await as(trial)
    expect(await fail(`insert into invoices(user_id,client_name,invoice_number,amount,due_date,is_sample) values('${trial}','X','HACK',10,'2026-12-01',true)`)).toMatch(/exemple/)
    expect(await fail(`update invoices set is_sample=true where invoice_number='R-0'`)).toMatch(/non modifiables/)
    expect(await fail(`update invoices set is_sample=false where invoice_number='EXEMPLE-1'`)).toMatch(/non modifiables/)
    expect(await fail(`select set_config('encair.creating_samples','on',false); insert into invoices(user_id,client_name,invoice_number,amount,due_date,is_sample) values('${trial}','X','HACK2',10,'2026-12-01',true)`)).toBeNull()
    // Le réglage n'est pas exposé par l'API : seul un accès SQL direct pourrait le poser.
    await db.exec(`reset role; delete from invoices where invoice_number='HACK2'; select set_config('encair.creating_samples','',false);`)
  })

  it('refusé à un essai expiré', async () => {
    await as(expired)
    expect(await fail('select public.create_sample_invoices()')).toMatch(/essai actif requis/)
  })

  it('aucune relance serveur ni notification sur un exemple', async () => {
    await db.exec('reset role')
    const id = (await db.query<{ id: string }>(`select id from invoices where invoice_number='EXEMPLE-1'`)).rows[0].id
    expect(await fail(`select public.claim_collection_reminder('${id}','${trial}','email_1','s','c')`)).toMatch(/Facture d’exemple/)
    await db.exec(`select public.generate_collection_notifications('${trial}')`)
    expect(Number((await db.query<{ n: number }>(`select count(*)::int n from notifications where body like '%(exemple)%'`)).rows[0].n)).toBe(0)
  })

  it('un autre compte ne voit ni ne supprime les exemples', async () => {
    await as(other)
    expect(await count(`true`)).toBe(0)
    await db.exec(`delete from invoices where is_sample`)
    await db.exec('reset role')
    expect(await count(`user_id='${trial}' and is_sample`)).toBe(5)
  })

  it('le client supprime ses exemples sans toucher à ses vraies factures', async () => {
    await as(trial)
    await db.exec(`delete from invoices where user_id='${trial}' and is_sample`)
    await db.exec('reset role')
    expect(await count(`user_id='${trial}' and is_sample`)).toBe(0)
    expect(await count(`user_id='${trial}' and not is_sample`)).toBe(10)
  })
})

// ---------- Route /api/invoices/samples
const route = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), filters: [] as [string, unknown][], deleted: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: route.user },
    rpc: route.rpc,
    from: () => {
      const q = {
        delete: () => q,
        eq: (c: string, v: unknown) => { route.filters.push([c, v]); return q },
        select: () => route.deleted(),
      }
      return q
    },
  }),
}))

describe('Route /api/invoices/samples', () => {
  beforeEach(() => {
    route.user.mockResolvedValue({ data: { user: { id: 'owner' } } })
    route.rpc.mockResolvedValue({ data: { created: 5 }, error: null })
    route.deleted.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null })
    route.filters = []
  })
  it('refuse un visiteur non connecté', async () => {
    route.user.mockResolvedValueOnce({ data: { user: null } })
    const { POST } = await import('@/app/api/invoices/samples/route')
    expect((await POST()).status).toBe(401)
  })
  it('crée les exemples', async () => {
    const { POST } = await import('@/app/api/invoices/samples/route')
    const response = await POST()
    expect(response.status).toBe(201)
    expect(route.rpc).toHaveBeenCalledWith('create_sample_invoices')
  })
  it('explique pourquoi un espace déjà rempli est refusé', async () => {
    route.rpc.mockResolvedValueOnce({ data: null, error: { code: '23514', message: 'Les exemples ne s’ajoutent qu’à un espace vide.' } })
    const { POST } = await import('@/app/api/invoices/samples/route')
    const response = await POST()
    expect(response.status).toBe(409)
    expect((await response.json()).error).toMatch(/espace vide/)
  })
  it('ne supprime que les exemples du compte connecté', async () => {
    const { DELETE } = await import('@/app/api/invoices/samples/route')
    const response = await DELETE()
    expect(await response.json()).toEqual({ removed: 2 })
    expect(route.filters).toEqual([['user_id', 'owner'], ['is_sample', true]])
  })
})
