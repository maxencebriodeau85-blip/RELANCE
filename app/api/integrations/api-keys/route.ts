import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateApiKey, hashApiKey } from '@/lib/crypto'

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
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 80)
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  // Limit: 5 keys per user
  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 clés API par compte' }, { status: 400 })
  }

  const fullKey = generateApiKey()
  const keyHash = await hashApiKey(fullKey)
  const keyPrefix = fullKey.slice(0, 15) // "rf_live_xxxxxx"

  const { error: insertErr } = await supabase.from('api_keys').insert({
    user_id:    user.id,
    name,
    key_hash:   keyHash,
    key_prefix: keyPrefix,
  } as never)

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Return full key ONCE — never stored in plaintext
  return NextResponse.json({ key: fullKey, prefix: keyPrefix, name }, { status: 201 })
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
