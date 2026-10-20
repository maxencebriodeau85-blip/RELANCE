import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { readJsonBody } from '@/lib/request-json'
import { sendReminder } from '@/lib/reminder-service'
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const parsed = await readJsonBody(request, 4096)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  const body = parsed.value as { type?: string; confirmation?: string } | null
  if (!['email_1', 'email_2', 'email_3'].includes(body?.type || ''))
    return NextResponse.json(
      { error: 'Choisissez une relance amiable valide.' },
      { status: 400 },
    )
  if (typeof body?.confirmation !== 'string') return NextResponse.json({ error: 'Vérifiez l’aperçu et confirmez l’envoi.' }, { status: 409 })
  const result = await sendReminder((await params).id, user.id, body.type as 'email_1' | 'email_2' | 'email_3', 'manual', body.confirmation)
  return NextResponse.json(result, { status: result.status })
}
