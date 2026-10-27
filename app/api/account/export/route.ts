import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { collectAccountExport, type ExportClient } from '@/lib/account-export'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const noStore = { 'Cache-Control': 'no-store' }

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: noStore })

  const limit = rateLimit(user.id, { key: 'account-export', limit: 5, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed)
    return NextResponse.json(
      { error: 'Trop d’exports en peu de temps. Réessayez dans une heure.' },
      { status: 429, headers: { ...noStore, 'Retry-After': String(limit.retryAfterSec) } },
    )

  const result = await collectAccountExport(supabase as unknown as ExportClient, user)
  if (!result.ok)
    return NextResponse.json(
      {
        error:
          result.reason === 'too_large'
            ? 'Votre compte contient trop de données pour un export automatique. Écrivez-nous : nous vous l’envoyons sous 30 jours.'
            : 'Export momentanément indisponible. Réessayez dans un instant.',
      },
      { status: 503, headers: noStore },
    )

  const day = result.data.genere_le.slice(0, 10)
  return new NextResponse(JSON.stringify(result.data, null, 2), {
    headers: {
      ...noStore,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="encair-mes-donnees-${day}.json"`,
    },
  })
}
