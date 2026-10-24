import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
let db: PGlite
type Worker = {
  last_attempt_at: string | null
  last_blocked_reason: string | null
  started_at: string | null
}
const worker = async () =>
  (
    await db.query<Worker>(
      "select last_attempt_at,last_blocked_reason,started_at from collection_worker where name='reminders'",
    )
  ).rows[0]
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
 create table request_buckets(window_start timestamptz); create table integration_requests(created_at timestamptz);`)
  for (const file of [
    '20261018082548_collection_operations.sql',
    '20261024151000_collection_worker_attempts.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
  await db.exec(`grant usage on schema public to service_role;
 grant all on request_buckets,integration_requests to service_role;
 set role service_role;`)
}, 30000)
afterAll(async () => {
  await db?.close()
})
describe('Collection worker attempts', () => {
  it('is callable only by the server role, without definer escalation', async () => {
    const allowed = async (role: string, fn: string) =>
      (
        await db.query<{ allowed: boolean }>(
          'select has_function_privilege($1,$2,\'EXECUTE\') as allowed',
          [role, fn],
        )
      ).rows[0].allowed
    for (const fn of [
      'public.record_collection_worker_attempt(text)',
      'public.claim_collection_worker()',
    ]) {
      for (const role of ['anon', 'authenticated', 'public'])
        expect(await allowed(role, fn)).toBe(false)
      expect(await allowed('service_role', fn)).toBe(true)
    }
    expect(
      (
        await db.query<{ definer: boolean; config: string[] }>(
          "select prosecdef as definer,proconfig as config from pg_proc where oid='public.record_collection_worker_attempt(text)'::regprocedure",
        )
      ).rows[0],
    ).toEqual({ definer: false, config: ['search_path=""'] })
  })
  it('stamps blocked attempts and rejects unknown reasons', async () => {
    expect(await worker()).toEqual({
      last_attempt_at: null,
      last_blocked_reason: null,
      started_at: null,
    })
    await db.query("select record_collection_worker_attempt('automation_not_configured')")
    const blocked = await worker()
    expect(blocked.last_attempt_at).toBeTruthy()
    expect(blocked.last_blocked_reason).toBe('automation_not_configured')
    expect(blocked.started_at).toBeNull()
    await expect(
      db.query("select record_collection_worker_attempt('customer@example.com')"),
    ).rejects.toThrow('collection_worker_blocked_reason_check')
  })
  it('clears the blocked reason on a successful claim and keeps leases exclusive', async () => {
    await db.query("select record_collection_worker_attempt('claim_failed')")
    const claim = (
      await db.query<{ result: { lease_id: string } | null }>(
        'select claim_collection_worker() as result',
      )
    ).rows[0].result
    expect(claim?.lease_id).toBeTruthy()
    const claimed = await worker()
    expect(claimed.last_blocked_reason).toBeNull()
    expect(claimed.last_attempt_at).toBeTruthy()
    expect(claimed.started_at).toBeTruthy()
    expect(
      (await db.query('select claim_collection_worker() as result')).rows[0],
    ).toEqual({ result: null })
  })
})
