import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { assertActiveAccess } from '@/lib/access-control'
import { TEMPLATE_VARIABLES } from '@/lib/reminder-templates'
import { z } from 'zod'

const types = ['email_1', 'email_2', 'email_3', 'formal_notice'] as const
const fields = 'template_type,subject,body,enabled'
const schema = z.object({
  template_type: z.enum(types),
  subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value)),
  body: z.string().trim().min(1).max(5000),
  enabled: z.boolean().default(true),
}).strict()
const unavailable = () => NextResponse.json({ error: 'Les modèles sont momentanément indisponibles. Réessayez.' }, { status: 503 })

async function context(write = false) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: 'Reconnectez-vous pour continuer.' }, { status: 401 }) }
  if (write) {
    const { data, error } = await db.from('profiles').select('plan,trial_ends_at').eq('id', user.id).single()
    if (error) return { response: unavailable() }
    // Custom reminders are included in the active trial and Founder offer.
    const access = assertActiveAccess(data)
    if (!access.ok) return { response: NextResponse.json({ error: access.error }, { status: access.status }) }
  }
  return { db, user }
}

export async function GET() {
  try {
    const ctx = await context()
    if (ctx.response) return ctx.response
    const { data, error } = await ctx.db.from('email_template_overrides').select(fields).eq('user_id', ctx.user.id)
    if (error || !data) return unavailable()
    return NextResponse.json({ templates: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return unavailable() }
}

export async function PUT(request: Request) {
  try {
    const ctx = await context(true)
    if (ctx.response) return ctx.response
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Vérifiez le modèle : objet de 1 à 200 caractères, message de 1 à 5 000 caractères.' }, { status: 422 })
    const value = parsed.data
    const allowed = new Set<string>([...TEMPLATE_VARIABLES.map(v => v.name), 'payment_url'])
    const unknown = [...(value.subject + value.body).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).filter(name => !allowed.has(name))
    if (unknown.length) return NextResponse.json({ error: `Variable inconnue : ${unknown[0]}. Utilisez les variables indiquées dans l’éditeur.` }, { status: 422 })
    const { data, error } = await ctx.db.from('email_template_overrides')
      .upsert({ ...value, user_id: ctx.user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id,template_type' })
      .select(fields).single()
    if (error || !data) return unavailable()
    return NextResponse.json({ template: data })
  } catch { return unavailable() }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await context(true)
    if (ctx.response) return ctx.response
    const type = new URL(request.url).searchParams.get('type')
    if (!types.includes(type as typeof types[number])) return NextResponse.json({ error: 'Type de modèle invalide.' }, { status: 422 })
    const { error } = await ctx.db.from('email_template_overrides').delete().eq('user_id', ctx.user.id).eq('template_type', type)
    if (error) return unavailable()
    // A zero-row delete is valid: the default template is already active.
    return NextResponse.json({ success: true })
  } catch { return unavailable() }
}
