import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_TYPES = ['call', 'email', 'note', 'meeting']

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Verify contact belongs to user
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!contact) return NextResponse.json({ error: 'Contact introuvable' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const content = String(body.content || '').trim()
  if (!content) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })

  const type = VALID_TYPES.includes(body.type) ? body.type : 'note'

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      contact_id:       params.id,
      user_id:          user.id,
      type,
      content,
      duration_minutes: type === 'call' && body.duration_minutes ? parseInt(body.duration_minutes) : null,
      occurred_at:      body.occurred_at || new Date().toISOString(),
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { entryId } = await request.json().catch(() => ({}))
  if (!entryId) return NextResponse.json({ error: 'entryId requis' }, { status: 400 })

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id)
    .eq('contact_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
