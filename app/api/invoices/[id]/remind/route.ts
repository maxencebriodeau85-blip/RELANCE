import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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
  const body = await request.json().catch(() => null)
  if (!['email_1', 'email_2', 'email_3'].includes(body?.type))
    return NextResponse.json(
      { error: 'Choisissez une relance amiable valide.' },
      { status: 400 },
    )
  const result = await sendReminder((await params).id, user.id, body.type)
  return NextResponse.json(result, { status: result.status })
}
