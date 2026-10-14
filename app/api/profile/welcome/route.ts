import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/app-url'

export async function POST() {
  if (!process.env.RESEND_FROM_EMAIL || !process.env.RESEND_API_KEY || !process.env.SUPPORT_EMAIL) return NextResponse.json({ error: 'Messagerie indisponible.' }, { status: 503 })
  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user?.email || !user.email_confirmed_at) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const claimedAt = new Date().toISOString()
    const { data: profile, error } = await db.from('profiles').update({ welcome_email_sent_at: claimedAt } as never).eq('id', user.id).is('welcome_email_sent_at', null).select('company_name').maybeSingle()
    if (error) throw error
    if (!profile) return NextResponse.json({ already_sent: true })
    // HTTP header, not a header embedded in the email body. Unknown network
    // outcomes retain the claim to avoid duplicate deliveries.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `welcome-${user.id}` },
      body: JSON.stringify({
        from: `Encair <${process.env.RESEND_FROM_EMAIL}>`, to: [user.email], reply_to: process.env.SUPPORT_EMAIL,
        subject: 'Bienvenue dans votre espace Encair',
        text: `Bienvenue sur Encair !\n\nVotre espace de suivi est prêt. Votre essai comprend 30 jours et 10 factures, sans carte bancaire.\n\n1. Vérifiez vos coordonnées.\n2. Importez l’export CSV de votre logiciel de facturation.\n3. Confirmez les soldes puis levez la pause sur les factures à suivre.\n\nLes factures importées restent en pause jusqu’à votre validation.\n\nOuvrir mon espace : ${getAppUrl()}/dashboard\n\nUne question ? Répondez à cet email.\n\nEncair`,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.id) {
      if (response.status >= 400 && response.status < 500 && response.status !== 409) await db.from('profiles').update({ welcome_email_sent_at: null } as never).eq('id', user.id).eq('welcome_email_sent_at', claimedAt)
      return NextResponse.json({ sent: false }, { status: 503 })
    }
    return NextResponse.json({ sent: true })
  } catch { return NextResponse.json({ error: 'Messagerie indisponible.' }, { status: 503 }) }
}
