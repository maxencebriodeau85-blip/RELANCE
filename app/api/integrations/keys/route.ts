import { randomBytes } from 'node:crypto'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hashSecret, apiResponse, apiError } from '@/lib/integration-api'
import { readJsonBody } from '@/lib/request-json'
import { assertActiveAccess } from '@/lib/access-control'
async function context() {
  const session = await createClient(),
    {
      data: { user },
      error,
    } = await session.auth.getUser()
  if (error || !user)
    return {
      response: apiResponse(
        { error: 'Connectez-vous pour continuer.' },
        error && (!error.status || error.status >= 500) ? 503 : 401,
      ),
    }
  return { user, db: await createAdminClient() }
}
export async function GET(request: Request) {
  try {
    const c = await context()
    if (c.response) return c.response
    const offset = Number(
      new URL(request.url).searchParams.get('offset') || '0',
    )
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      return apiResponse({ error: 'Pagination invalide.' }, 400)
    const { data, error } = await c
      .db!.from('integration_keys')
      .select(
        'id,name,key_prefix,scopes,created_at,expires_at,revoked_at,last_used_at',
      )
      .eq('user_id', c.user!.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 50)
    return error
      ? apiError(error)
      : apiResponse({
          keys: data?.slice(0, 50),
          hasMore: (data?.length || 0) > 50,
        })
  } catch {
    return apiError({})
  }
}
export async function POST(request: Request) {
  try {
    const c = await context()
    if (c.response) return c.response
    const parsed = await readJsonBody(request, 4096)
    if (!parsed.ok) return apiResponse({ error: parsed.error }, parsed.status)
    const b = parsed.value as { name?: unknown; scopes?: unknown } | null
    if (
      typeof b?.name !== 'string' ||
      !b.name.trim() ||
      b.name.trim().length > 80 ||
      !Array.isArray(b.scopes) ||
      !b.scopes.length ||
      b.scopes.length > 2 ||
      b.scopes.some((s) => !['invoices:read', 'invoices:write'].includes(s))
    )
      return apiResponse({ error: 'Nom et permissions valides requis.' }, 422)
    const { data: profile, error: pe } = await c
      .db!.from('profiles')
      .select('plan,trial_ends_at')
      .eq('id', c.user!.id)
      .single()
    if (pe) return apiError(pe)
    const access = assertActiveAccess(profile)
    if (!access.ok) return apiResponse({ error: access.error }, access.status)
    const { data: allowed, error: re } = await c.db!.rpc(
      'consume_request_bucket',
      { p_bucket: `key-create:${c.user!.id}`, p_limit: 10, p_seconds: 86400 },
    )
    if (re) return apiError(re)
    if (!allowed)
      return apiResponse(
        { error: '10 créations de clés maximum par 24 heures.' },
        429,
        { 'Retry-After': '86400' },
      )
    const token = `encair_${randomBytes(32).toString('hex')}`
    const { data, error } = await c
      .db!.from('integration_keys')
      .insert({
        user_id: c.user!.id,
        name: b.name.trim(),
        scopes: [...new Set(b.scopes)],
        key_hash: hashSecret(token),
        key_prefix: token.slice(0, 15),
      })
      .select('id,name,key_prefix,scopes,created_at,expires_at')
      .single()
    return error ? apiError(error) : apiResponse({ key: data, token }, 201)
  } catch {
    return apiError({})
  }
}
export async function DELETE(request: Request) {
  try {
    const c = await context()
    if (c.response) return c.response
    const parsed = await readJsonBody(request, 1024)
    if (!parsed.ok) return apiResponse({ error: parsed.error }, parsed.status)
    const id = (parsed.value as { id?: unknown })?.id
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
      return apiResponse({ error: 'Identifiant de clé invalide.' }, 422)
    const { data, error } = await c
      .db!.from('integration_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', c.user!.id)
      .eq('id', id)
      .select('id')
      .maybeSingle()
    return error
      ? apiError(error)
      : !data
        ? apiResponse({ error: 'Clé introuvable.' }, 404)
        : apiResponse({ success: true })
  } catch {
    return apiError({})
  }
}
