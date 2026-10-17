import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: 'Notifications indisponibles.' }, { status: 503 })

  const { count, error: countError } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
  if (countError || count === null) return NextResponse.json({ error: 'Notifications indisponibles.' }, { status: 503 })
  return NextResponse.json({ notifications: data || [], unreadCount: count }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { error } = await supabase
    .from('notifications')
    .update({ read: true } as never)
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return NextResponse.json({ error: 'Notifications indisponibles.' }, { status: 503 })
  return NextResponse.json({ success: true })
}
