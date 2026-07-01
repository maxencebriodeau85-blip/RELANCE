import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { assertActiveAccess } from '@/lib/access-control'
import type { Profile } from '@/lib/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (stage) query = query.eq('pipeline_stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Trial gate — a lapsed free-trial can't create new contacts (data kept, writes blocked).
  const { data: prof } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single()
  const access = assertActiveAccess(prof as Pick<Profile, 'plan' | 'trial_ends_at'> | null)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id:        user.id,
      name,
      company:        body.company?.trim() || null,
      email:          body.email?.trim().toLowerCase() || null,
      phone:          body.phone?.trim() || null,
      tags:           Array.isArray(body.tags) ? body.tags : [],
      pipeline_stage: body.pipeline_stage || 'prospect',
      deal_amount:    body.deal_amount ? parseFloat(String(body.deal_amount)) : null,
      notes:          body.notes?.trim() || null,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data }, { status: 201 })
}
