import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_TYPES = ['email_1', 'email_2', 'email_3', 'formal_notice'] as const
type TemplateType = (typeof VALID_TYPES)[number]

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
