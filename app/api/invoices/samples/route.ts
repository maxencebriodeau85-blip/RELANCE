import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const noStore = { 'Cache-Control': 'no-store' }

// Cinq factures d'exemple dans un espace vide (create_sample_invoices, sous RLS).
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: noStore })
  const { error } = await supabase.rpc('create_sample_invoices')
  if (error) {
    const known = error.code === '23514' || error.code === '42501'
    return NextResponse.json(
      { error: known ? error.message : 'Exemples momentanément indisponibles. Réessayez.' },
      { status: error.code === '23514' ? 409 : error.code === '42501' ? 403 : 503, headers: noStore },
    )
  }
  return NextResponse.json({ created: 5 }, { status: 201, headers: noStore })
}

// Retire les exemples du compte connecté ; ses vraies factures ne sont jamais touchées.
export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: noStore })
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('user_id', user.id)
    .eq('is_sample', true)
    .select('id')
  if (error) return NextResponse.json({ error: 'Suppression impossible. Réessayez.' }, { status: 503, headers: noStore })
  return NextResponse.json({ removed: data?.length ?? 0 }, { headers: noStore })
}
