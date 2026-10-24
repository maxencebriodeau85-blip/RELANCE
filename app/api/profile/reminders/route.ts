import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertActiveAccess } from '@/lib/access-control'
import { serviceCapabilities } from '@/lib/service-capabilities'

const fields = 'auto_reminders, active_scenario, plan, trial_ends_at'
const unavailable = () => NextResponse.json({ error: 'Impossible de charger ou d’enregistrer vos réglages. Réessayez.' }, { status: 503 })

export async function GET() {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 })
    const { data, error } = await db.from('profiles').select(fields).eq('id', user.id).single()
    if (error || !data) return unavailable()
    return NextResponse.json({ settings: { auto_reminders: data.auto_reminders, active_scenario: data.active_scenario }, capabilities: serviceCapabilities() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return unavailable() }
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Connectez-vous pour continuer.' }, { status: 401 })
    const body = await request.json().catch(() => null)
    if (!body || Array.isArray(body) || !Object.keys(body).length ||
      Object.keys(body).some(key => !['auto_reminders', 'active_scenario'].includes(key)) ||
      ('auto_reminders' in body && typeof body.auto_reminders !== 'boolean') ||
      ('active_scenario' in body && !['standard', 'soft', 'firm'].includes(body.active_scenario))) {
      return NextResponse.json({ error: 'Réglages invalides.' }, { status: 422 })
    }
    const { data: profile, error: readError } = await db.from('profiles').select(fields).eq('id', user.id).single()
    if (readError || !profile) return unavailable()
    // Stopping sends must remain possible even after a trial has expired.
    const stoppingOnly = body.auto_reminders === false && Object.keys(body).length === 1
    if (!stoppingOnly) {
      const access = assertActiveAccess(profile)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    }
    if (body.auto_reminders === true && !serviceCapabilities().automationAvailable) {
      return NextResponse.json({ error: 'L’envoi automatique n’est pas encore disponible. Vous pouvez continuer à suivre et actualiser vos factures.' }, { status: 503 })
    }
    const { data, error } = await db.from('profiles').update(body).eq('id', user.id)
      .select('auto_reminders, active_scenario').single()
    if (error || !data) return unavailable()
    return NextResponse.json({ settings: data, capabilities: serviceCapabilities() })
  } catch { return unavailable() }
}
