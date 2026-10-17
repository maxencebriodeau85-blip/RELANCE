import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const db = await createClient()
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError) return NextResponse.json({ error: 'Connexion indisponible.' }, { status: authError.status && authError.status < 500 ? 401 : 503 })
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const admin = await createAdminClient()
    // Never accept an account ID from request data. SQL grants execution only to the server role.
    const { data, error } = await admin.rpc('generate_collection_notifications', { p_user_id: user.id })
    if (error || !data) return NextResponse.json({ error: 'Actualisation des alertes indisponible.' }, { status: 503 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Actualisation des alertes indisponible.' }, { status: 503 })
  }
}
