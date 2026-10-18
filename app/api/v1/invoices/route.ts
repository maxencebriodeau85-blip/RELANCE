import {
  apiContext,
  apiError,
  apiResponse,
  hashSecret,
  validateSync,
} from '@/lib/integration-api'
import { readJsonBody } from '@/lib/request-json'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    const ctx = await apiContext(request)
    if (ctx.response) return ctx.response
    const requestId = request.headers.get('idempotency-key')
    if (!requestId || !/^[a-zA-Z0-9_.:-]{8,128}$/.test(requestId))
      return apiResponse(
        {
          error: {
            code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: 'En-tête Idempotency-Key requis (8 à 128 caractères).',
          },
        },
        400,
      )
    const parsed = await readJsonBody(request, 256 * 1024)
    if (!parsed.ok)
      return apiResponse(
        { error: { code: 'INVALID_BODY', message: parsed.error } },
        parsed.status,
      )
    const input = validateSync(parsed.value)
    if (!input)
      return apiResponse(
        {
          error: {
            code: 'INVALID_INPUT',
            message:
              'Source, 1 à 100 factures valides, external_id unique et expected_updated_at requis. Consultez la documentation.',
          },
        },
        422,
      )
    const { data, error } = await ctx.db!.rpc('integration_sync', {
      p_hash: ctx.hash,
      p_request_id: requestId,
      p_body_hash: hashSecret(JSON.stringify(input)),
      p_source: input.source,
      p_rows: input.invoices,
    })
    return error ? apiError(error) : apiResponse(data)
  } catch {
    return apiError({})
  }
}
export async function GET(request: Request) {
  try {
    const ctx = await apiContext(request)
    if (ctx.response) return ctx.response
    const url = new URL(request.url),
      after = url.searchParams.get('after'),
      rawLimit = url.searchParams.get('limit') || '50',
      limit = Number(rawLimit)
    if (
      !/^\d+$/.test(rawLimit) ||
      limit < 1 ||
      limit > 100 ||
      (after &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          after,
        ))
    )
      return apiResponse(
        {
          error: {
            code: 'INVALID_CURSOR',
            message: 'Curseur UUID et limite entre 1 et 100 attendus.',
          },
        },
        400,
      )
    const { data, error } = await ctx.db!.rpc('integration_list', {
      p_hash: ctx.hash,
      p_after: after,
      p_limit: limit,
    })
    if (error) return apiError(error)
    const invoices = data.invoices.slice(0, limit)
    return apiResponse({
      invoices,
      next_cursor:
        data.invoices.length > limit ? invoices[invoices.length - 1].id : null,
    })
  } catch {
    return apiError({})
  }
}
