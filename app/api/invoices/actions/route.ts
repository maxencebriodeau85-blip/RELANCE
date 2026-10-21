import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function POST(request: Request) {
  try {
    const db = await createClient()
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (
      !body ||
      !['paid', 'disputed', 'delete'].includes(body.action) ||
      !Array.isArray(body.items) ||
      !body.items.length ||
      body.items.length > 100 ||
      body.items.some(
        (r: { id?: unknown; updated_at?: unknown } | null) =>
          !r ||
          typeof r.id !== 'string' ||
          !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(r.id) ||
          typeof r.updated_at !== 'string' ||
          !Number.isFinite(Date.parse(r.updated_at)),
      )
    )
      return NextResponse.json(
        { error: 'Sélection invalide : 1 à 100 factures avec leur version.' },
        { status: 422 },
      )
    const { data, error } = await db.rpc('apply_invoice_action', {
      items: body.items,
      action: body.action,
    })
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === '40001'
              ? 'Une facture a changé. Rechargez la liste : aucune modification enregistrée.'
              : error.code === '42501'
                ? 'Abonnement ou essai actif requis.'
                : error.code === '22023'
                  ? error.message
                  : 'Action impossible. Aucune modification enregistrée.',
        },
        {
          status:
            error.code === '40001' ? 409 : error.code === '42501' ? 403 : 422,
        },
      )
    return NextResponse.json({ success: true, ...data })
  } catch {
    return NextResponse.json(
      {
        error:
          'Action non confirmée. Rechargez vos factures avant de réessayer.',
      },
      { status: 503 },
    )
  }
}
