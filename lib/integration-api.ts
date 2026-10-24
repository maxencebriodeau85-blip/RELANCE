import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateInvoiceRows } from '@/lib/invoice-input'
export const hashSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export const apiResponse = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })
export function apiError(error: { code?: string; message?: string }) {
  const status =
    error.code === '28000'
      ? 401
      : error.code === '42501' || error.code === '23514'
        ? 403
        : ['40001', '23505'].includes(error.code || '')
          ? 409
          : ['22023', '22007'].includes(error.code || '')
            ? 422
            : 503
  const code = (
    {
      401: 'INVALID_KEY',
      403: 'ACCESS_OR_QUOTA_DENIED',
      409: 'CONFLICT',
      422: 'INVALID_INPUT',
      503: 'SERVICE_UNAVAILABLE',
    } as Record<number, string>
  )[status]
  return apiResponse(
    {
      error: {
        code,
        message:
          status === 409
            ? 'Relisez les factures et vérifiez la version ou la clé d’idempotence.'
            : status === 503
              ? 'Service momentanément indisponible. Réessayez avec la même clé d’idempotence.'
              : code,
      },
    },
    status,
  )
}
export async function apiContext(request: Request) {
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer (encair_[a-f0-9]{64})$/)?.[1]
  if (!token)
    return {
      response: apiResponse(
        { error: { code: 'INVALID_KEY', message: 'Clé Bearer requise.' } },
        401,
      ),
    }
  const db = await createAdminClient(),
    hash = hashSecret(token)
  // Hash lookup before creating a bucket avoids unbounded storage for random credentials.
  const { data: key, error } = await db
    .from('integration_keys')
    .select('id,user_id,revoked_at,expires_at')
    .eq('key_hash', hash)
    .maybeSingle()
  if (error) return { response: apiError(error) }
  if (!key || key.revoked_at || Date.parse(key.expires_at) <= Date.now())
    return { response: apiError({ code: '28000' }) }
  const { data: allowed, error: rateError } = await db.rpc(
    'consume_request_bucket',
    { p_bucket: `integration:${key.user_id}`, p_limit: 60, p_seconds: 60 },
  )
  if (rateError) return { response: apiError(rateError) }
  if (!allowed)
    return {
      response: apiResponse(
        {
          error: {
            code: 'RATE_LIMITED',
            message: '60 requêtes par minute et par compte.',
          },
        },
        429,
        { 'Retry-After': '60' },
      ),
    }
  return { db, hash }
}
export function validateSync(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const b = value as Record<string, unknown>
  if (
    typeof b.source !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,50}$/.test(b.source) ||
    !Array.isArray(b.invoices) ||
    b.invoices.length < 1 ||
    b.invoices.length > 100
  )
    return null
  const allowed = new Set([
    'external_id',
    'expected_updated_at',
    'invoice_number',
    'client_name',
    'client_email',
    'amount',
    'remaining_amount',
    'due_date',
    'issued_date',
    'client_address',
    'client_siren',
  ])
  if (Object.keys(b).some((k) => !['source', 'invoices'].includes(k)))
    return null
  const ids = new Set<string>()
  for (const row of b.invoices) {
    if (
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      Object.keys(row).some((k) => !allowed.has(k)) ||
      typeof row.external_id !== 'string' ||
      !row.external_id.trim() ||
      row.external_id.length > 100 ||
      ids.has(row.external_id) ||
      !('expected_updated_at' in row)
    )
      return null
    ids.add(row.external_id)
  }
  const result = validateInvoiceRows(b.invoices)
  if (result.errors.length) return null
  return {
    source: b.source,
    invoices: result.valid.map((r, i) => ({
      ...r,
      external_id: b.invoices instanceof Array ? b.invoices[i].external_id : '',
    })),
  }
}
