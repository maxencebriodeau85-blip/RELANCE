import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { buildTrialReminderEmail, trialEndLabel, type TrialReminderRow } from '../trial-reminders'

const NOW = new Date('2026-10-27T08:30:00Z')
const row = (extra: Partial<TrialReminderRow> = {}): TrialReminderRow => ({
  user_id: 'u1',
  email: 'client@encair.test',
  company_name: 'Bureau Martin',
  trial_ends_at: '2026-11-03T09:00:00Z',
  invoices: 4,
  outstanding: '2800.00',
  reminders_sent: 2,
  ...extra,
})

describe('Contenu des emails de fin d’essai', () => {
  it('raisonne au calendrier de Paris, pas en UTC', () => {
    // 22 h 30 UTC le 27 = 23 h 30 à Paris le 27 : c'est encore aujourd'hui.
    expect(trialEndLabel(new Date('2026-10-27T22:30:00Z'), NOW)).toBe('aujourd’hui')
    // 23 h 30 UTC le 27 = 0 h 30 à Paris le 28 : c'est déjà demain.
    expect(trialEndLabel(new Date('2026-10-27T23:30:00Z'), NOW)).toBe('demain')
  })
  it('distingue aujourd’hui, demain et une date', () => {
    expect(trialEndLabel(new Date('2026-10-27T20:00:00Z'), NOW)).toBe('aujourd’hui')
    expect(trialEndLabel(new Date('2026-10-28T10:00:00Z'), NOW)).toBe('demain')
    expect(trialEndLabel(new Date('2026-11-03T09:00:00Z'), NOW)).toBe('le mardi 3 novembre')
  })
  it('J-7 : rappelle ce que le client suit déjà et le prix exact', () => {
    const { subject, text } = buildTrialReminderEmail(row(), 'https://encair.fr', NOW)
    expect(subject).toBe('Votre essai Encair se termine le mardi 3 novembre')
    expect(text).toContain('4 factures pour 2 800,00 € restant dû, et a déjà envoyé 2 relances.')
    expect(text).toContain('offre Fondateur à 16 € par mois, 100 nouvelles factures par mois, sans engagement')
    expect(text).toContain('https://encair.fr/subscription')
    expect(text).toContain('rien n’est supprimé')
  })
  it('J-1 sans facture : invite à importer plutôt qu’à payer à l’aveugle', () => {
    const { subject, text } = buildTrialReminderEmail(
      row({ trial_ends_at: '2026-10-28T10:00:00Z', invoices: 0, outstanding: 0, reminders_sent: 0 }),
      'https://encair.fr',
      NOW,
    )
    expect(subject).toBe('Votre essai Encair se termine demain')
    expect(text).toContain('(mercredi 28 octobre)')
    expect(text).toContain('https://encair.fr/dashboard/invoices/import')
    expect(text).not.toMatch(/restant dû/)
  })
  it('accorde le singulier', () => {
    const { text } = buildTrialReminderEmail(row({ invoices: 1, outstanding: 350, reminders_sent: 1 }), 'https://x', NOW)
    expect(text).toContain('1 facture pour 350,00 € restant dû, et a déjà envoyé 1 relance.')
  })
})

// ---------- Route quotidienne
const mock = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: async () => ({ rpc: mock.rpc }) }))

const call = async (auth = 'Bearer secret') => {
  const { GET } = await import('@/app/api/cron/trial-reminders/route')
  return GET(new Request('https://encair.test/api/cron/trial-reminders', { headers: { authorization: auth } }))
}

describe('Route /api/cron/trial-reminders', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.resetModules()
    mock.rpc.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    for (const [k, v] of Object.entries({
      CRON_SECRET: 'secret', RESEND_API_KEY: 're_live', RESEND_FROM_EMAIL: 'relances@encair.fr',
      RESEND_WEBHOOK_SECRET: 'whsec_live', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPPORT_EMAIL: 'contact@encair.fr',
    })) vi.stubEnv(k, v)
    mock.rpc.mockImplementation(async (fn: string, args: { p_days?: number }) =>
      fn === 'claim_trial_reminders' ? { data: args.p_days === 7 ? [row()] : [], error: null } : { data: null, error: null },
    )
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('refuse un appel sans le secret', async () => {
    expect((await call('Bearer faux')).status).toBe(401)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it('ne fait rien tant que la messagerie n’est pas configurée', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect((await call()).status).toBe(503)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it('envoie une fois par compte et par étape, avec une clé d’idempotence', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }))
    const response = await call()
    expect(await response.json()).toEqual({ sent: 1, rejected: 0, unknown: 0 })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['Idempotency-Key']).toBe('trial-7-u1')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ to: ['client@encair.test'], reply_to: 'contact@encair.fr', from: 'Encair <relances@encair.fr>' })
    expect(mock.rpc).toHaveBeenCalledWith('claim_trial_reminders', { p_days: 7, p_limit: 40 })
    expect(mock.rpc).toHaveBeenCalledWith('claim_trial_reminders', { p_days: 1, p_limit: 40 })
    expect(mock.rpc).not.toHaveBeenCalledWith('release_trial_reminder', expect.anything())
  })

  it('libère la réservation si le prestataire refuse définitivement l’email', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'invalid' }), { status: 422 }))
    expect(await (await call()).json()).toEqual({ sent: 0, rejected: 1, unknown: 0 })
    expect(mock.rpc).toHaveBeenCalledWith('release_trial_reminder', { p_user: 'u1', p_days: 7 })
  })

  it('garde la réservation si l’issue est inconnue, pour ne jamais envoyer deux fois', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'))
    expect(await (await call()).json()).toEqual({ sent: 0, rejected: 0, unknown: 1 })
    expect(mock.rpc).not.toHaveBeenCalledWith('release_trial_reminder', expect.anything())
  })

  it('répond 503 si la réservation échoue', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'offline' } })
    expect((await call()).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// ---------- Migration (PGlite)
let db: PGlite
const ids = { j7: '00000000-0000-0000-0000-000000000007', j1: '00000000-0000-0000-0000-000000000001', far: '00000000-0000-0000-0000-000000000030', paid: '00000000-0000-0000-0000-0000000000aa', unconfirmed: '00000000-0000-0000-0000-0000000000bb' }

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
 create table public.profiles(id uuid primary key, plan text, company_name text, trial_ends_at timestamptz);
 create table public.invoices(user_id uuid, amount numeric, amount_paid numeric, status text);
 create table public.reminders(user_id uuid, status text);
 create function public.enforce_invoice_quota() returns trigger language plpgsql security definer as $$ begin return new; end $$;
 grant execute on function public.enforce_invoice_quota() to anon, authenticated;`)
  await db.exec(readFileSync('supabase/migrations/20261027233000_trial_reminders.sql', 'utf8'))
  await db.exec(`
 insert into auth.users values
  ('${ids.j7}','j7@x.test',now()), ('${ids.j1}','j1@x.test',now()), ('${ids.far}','far@x.test',now()),
  ('${ids.paid}','paid@x.test',now()), ('${ids.unconfirmed}','u@x.test',null);
 insert into public.profiles values
  ('${ids.j7}','free_trial','J7',now()+interval '6 days'), ('${ids.j1}','free_trial','J1',now()+interval '20 hours'),
  ('${ids.far}','free_trial','Loin',now()+interval '20 days'), ('${ids.paid}','starter','Payé',now()+interval '6 days'),
  ('${ids.unconfirmed}','free_trial','Non confirmé',now()+interval '6 days');
 insert into public.invoices values ('${ids.j7}',1200,200,'pending'), ('${ids.j7}',500,500,'paid'), ('${ids.j7}',300,0,'pending');
 insert into public.reminders values ('${ids.j7}','delivered'), ('${ids.j7}','pending'), ('${ids.j7}','failed');`)
}, 30000)
afterAll(async () => {
  await db?.close()
})

type Claimed = { user_id: string; email: string; invoices: number; outstanding: string; reminders_sent: number }
const claim = async (days: number) => (await db.query<Claimed>(`select * from public.claim_trial_reminders(${days})`)).rows

describe('Réservation SQL des emails de fin d’essai', () => {
  it('n’est appelable que par le serveur', async () => {
    for (const role of ['anon', 'authenticated'])
      expect((await db.query<{ ok: boolean }>(`select has_function_privilege('${role}','public.claim_trial_reminders(int,int)','EXECUTE') ok`)).rows[0].ok).toBe(false)
    expect((await db.query<{ ok: boolean }>(`select has_function_privilege('service_role','public.claim_trial_reminders(int,int)','EXECUTE') ok`)).rows[0].ok).toBe(true)
  })
  it('J-7 : seul l’essai qui finit dans la semaine, adresse confirmée, avec son usage réel', async () => {
    const rows = await claim(7)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: ids.j7, email: 'j7@x.test', invoices: 3, reminders_sent: 1 })
    expect(Number(rows[0].outstanding)).toBe(1300)
  })
  it('jamais deux fois la même étape', async () => {
    expect(await claim(7)).toHaveLength(0)
  })
  it('J-1 : l’essai qui finit dans les 36 heures', async () => {
    const rows = await claim(1)
    expect(rows.map((r) => r.user_id)).toEqual([ids.j1])
    expect(await claim(1)).toHaveLength(0)
  })
  it('une réservation libérée est reprise au passage suivant', async () => {
    await db.exec(`select public.release_trial_reminder('${ids.j7}', 7)`)
    expect((await claim(7)).map((r) => r.user_id)).toEqual([ids.j7])
  })
  it('ferme l’appel direct de la fonction de quota, comme en production', async () => {
    for (const role of ['anon', 'authenticated'])
      expect((await db.query<{ ok: boolean }>(`select has_function_privilege('${role}','public.enforce_invoice_quota()','EXECUTE') ok`)).rows[0].ok).toBe(false)
  })
  it('refuse une étape inconnue', async () => {
    await expect(claim(3)).rejects.toThrow(/Paramètres invalides/)
  })
})
