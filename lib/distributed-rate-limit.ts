import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
/** Failure is propagated: never silently revert to per-process protection. */
export async function distributedRateLimit(
  namespace: string,
  identity: string,
  limit: number,
  seconds: number,
) {
  const db = await createAdminClient()
  const hash = createHash('sha256').update(identity).digest('hex')
  const { data, error } = await db.rpc('consume_request_bucket', {
    p_bucket: `${namespace}:${hash}`,
    p_limit: limit,
    p_seconds: seconds,
  })
  if (error) throw Error('Protection temporairement indisponible.')
  return { allowed: data === true, retryAfterSec: seconds }
}
