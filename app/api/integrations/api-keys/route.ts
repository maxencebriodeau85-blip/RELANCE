import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { integrationUnavailable } from '@/lib/unavailable-features'

// GET — list user's API keys (never returns full key)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data || [] })
}

// POST — create a new API key
export async function POST() {
  return integrationUnavailable()
}

// DELETE — revoke a key
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
