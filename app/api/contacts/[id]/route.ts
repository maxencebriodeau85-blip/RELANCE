import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_STAGES = ['prospect', 'qualified', 'proposal', 'signed', 'lost']

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !contact) return NextResponse.json({ error: 'Contact introuvable' }, { status: 404 })

  const { data: journal } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('contact_id', params.id)
    .order('occurred_at', { ascending: false })

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, status, due_date, issued_date')
    .eq('contact_id', params.id)
    .eq('user_id', user.id)
    .order('issued_date', { ascending: false })

  return NextResponse.json({ contact, journal: journal || [], invoices: invoices || [] })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)           updates.name = String(body.name).trim()
  if (body.company !== undefined)        updates.company = body.company?.trim() || null
  if (body.email !== undefined)          updates.email = body.email?.trim().toLowerCase() || null
  if (body.phone !== undefined)          updates.phone = body.phone?.trim() || null
  if (body.tags !== undefined)           updates.tags = Array.isArray(body.tags) ? body.tags : []
  if (body.notes !== undefined)          updates.notes = body.notes?.trim() || null
  if (body.deal_amount !== undefined)    updates.deal_amount = body.deal_amount ? parseFloat(String(body.deal_amount)) : null
  if (body.pipeline_stage !== undefined) {
    if (!VALID_STAGES.includes(body.pipeline_stage)) {
      return NextResponse.json({ error: 'Étape invalide' }, { status: 400 })
    }
    updates.pipeline_stage = body.pipeline_stage
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(updates as never)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
