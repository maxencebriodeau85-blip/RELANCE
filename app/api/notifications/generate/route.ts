// POST /api/notifications/generate
// Scans contacts and invoices for actionable situations and creates in-app notifications.
// Designed to be called once per session from the NotificationBell component.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS)
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let created = 0
  const toInsert: object[] = []

  // ── 1. Stale proposals (> 7 days in proposal stage with no journal entry) ──
  const { data: proposals } = await supabase
    .from('contacts')
    .select('id, name, updated_at')
    .eq('user_id', user.id)
    .eq('pipeline_stage', 'proposal')

  for (const contact of proposals || []) {
    const daysSinceUpdate = daysSince(contact.updated_at)
    if (daysSinceUpdate < 7) continue

    // Check last journal entry
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('occurred_at')
      .eq('contact_id', contact.id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const daysSinceContact = lastEntry ? daysSince(lastEntry.occurred_at) : daysSinceUpdate

    if (daysSinceContact < 7) continue

    // Check if notification already exists (same contact, follow_up, last 7 days)
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_id', contact.id)
      .eq('type', 'follow_up')
      .gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString())
      .maybeSingle()

    if (existing) continue

    toInsert.push({
      user_id:    user.id,
      contact_id: contact.id,
      type:       'follow_up',
      title:      `Relancer ${contact.name}`,
      body:       `En proposition depuis ${daysSinceContact}j sans contact. Un suivi s'impose.`,
      action_url: `/dashboard/contacts/${contact.id}`,
    })
  }

  // ── 2. Qualified contacts not contacted in 14+ days ──────────────────────
  const { data: qualifieds } = await supabase
    .from('contacts')
    .select('id, name, updated_at')
    .eq('user_id', user.id)
    .eq('pipeline_stage', 'qualified')

  for (const contact of qualifieds || []) {
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('occurred_at')
      .eq('contact_id', contact.id)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const daysSince_ = lastEntry ? daysSince(lastEntry.occurred_at) : daysSince(contact.updated_at)
    if (daysSince_ < 14) continue

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_id', contact.id)
      .eq('type', 'reminder')
      .gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString())
      .maybeSingle()

    if (existing) continue

    toInsert.push({
      user_id:    user.id,
      contact_id: contact.id,
      type:       'reminder',
      title:      `Pas de contact avec ${contact.name}`,
      body:       `Qualifié mais aucune activité depuis ${daysSince_}j. Pensez à maintenir le lien.`,
      action_url: `/dashboard/contacts/${contact.id}`,
    })
  }

  // ── 3. Invoices overdue > 30 days ─────────────────────────────────────────
  const cutoff30 = new Date(Date.now() - 30 * DAY_MS).toISOString().split('T')[0]
  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, client_name, amount, invoice_number')
    .eq('user_id', user.id)
    .in('status', ['pending', 'reminded'])
    .lt('due_date', cutoff30)

  for (const inv of overdueInvoices || []) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'invoice_overdue')
      .eq('action_url', `/dashboard/invoices/${inv.id}`)
      .gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString())
      .maybeSingle()

    if (existing) continue

    const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.amount)
    toInsert.push({
      user_id:    user.id,
      type:       'invoice_overdue',
      title:      `Facture ${inv.invoice_number} en souffrance`,
      body:       `${inv.client_name} — ${amount} — plus de 30j de retard. Envisagez une mise en demeure.`,
      action_url: `/dashboard/invoices/${inv.id}`,
    })
  }

  // ── Batch insert ──────────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    const { error } = await supabase.from('notifications').insert(toInsert as never[])
    if (!error) created = toInsert.length
  }

  return NextResponse.json({ created, checked: (proposals?.length || 0) + (qualifieds?.length || 0) + (overdueInvoices?.length || 0) })
}
