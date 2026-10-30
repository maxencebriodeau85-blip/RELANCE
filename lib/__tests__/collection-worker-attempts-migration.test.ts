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
  it('recovers the checkpoint after lease expiry and rejects a stale worker finish', async () => {
    // Simulate a crashed worker without sleeping or running a real cron.
    await db.query("update collection_worker set lease_until=null where name='reminders'")
    const old = (await db.query<{ result: { lease_id: string } }>(
      'select claim_collection_worker() as result',
    )).rows[0].result.lease_id
    const checkpoint = '00000000-0000-4000-8000-000000000001'
    await db.query("update collection_worker set cursor_id=$1,lease_until=now()-interval '1 second' where name='reminders'", [checkpoint])
    const recovered = (await db.query<{ result: { lease_id: string; cursor_id: string } }>(
      'select claim_collection_worker() as result',
    )).rows[0].result
    expect(recovered.cursor_id).toBe(checkpoint)
    expect(recovered.lease_id).not.toBe(old)
    expect((await db.query('select claim_collection_worker() as result')).rows[0]).toEqual({ result: null })
    expect((await db.query('select finish_collection_worker($1,null,$2) as ok', [old, '{"ok":true}'])).rows[0]).toEqual({ ok: false })
    expect((await db.query('select finish_collection_worker($1,$2,$3) as ok', [recovered.lease_id, checkpoint, '{"ok":true}'])).rows[0]).toEqual({ ok: true })
    expect((await db.query<{ result: { cursor_id: string } }>('select claim_collection_worker() as result')).rows[0].result.cursor_id).toBe(checkpoint)
  })

})
