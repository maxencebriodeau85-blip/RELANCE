import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { assertPlan } from '@/lib/access-control'
import type { Profile } from '@/lib/database.types'

const VALID_TYPES = ['email_1', 'email_2', 'email_3', 'formal_notice'] as const
type TemplateType = (typeof VALID_TYPES)[number]

// Templates personnalisés = feature Pro. Shared guard for PUT/DELETE.
async function requireProPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ error: string; status: number } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', userId)
    .single()
  const gate = assertPlan(data as Pick<Profile, 'plan' | 'trial_ends_at'> | null, 'pro')
  return gate.ok ? null : { error: gate.error!, status: gate.status }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data } = await supabase
      .from('email_template_overrides')
      .select('*')
      .eq('user_id', user.id)

    return NextResponse.json({ templates: data ?? [] })
  } catch (err) {
    console.error('GET email-templates error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const gate = await requireProPlan(supabase, user.id)
    if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })

    const type = String(body.template_type) as TemplateType
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    const subject = String(body.subject || '').trim().slice(0, 200)
    const bodyText = String(body.body || '').trim().slice(0, 5000)
    const enabled = body.enabled !== false

    if (!subject || !bodyText) {
      return NextResponse.json({ error: 'Objet et corps requis' }, { status: 422 })
    }

    // Upsert
    const { error } = await supabase
      .from('email_template_overrides')
      .upsert({
        user_id: user.id,
        template_type: type,
        subject,
        body: bodyText,
        enabled,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'user_id,template_type' })

    if (error) {
      console.error('Upsert template error:', error)
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PUT email-templates error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TemplateType
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    await supabase
      .from('email_template_overrides')
      .delete()
      .eq('user_id', user.id)
      .eq('template_type', type)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE email-templates error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
