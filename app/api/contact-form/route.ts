import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || apiKey.includes('placeholder')) {
      console.log('[Contact form - DRY RUN]', { name, email, subject })
      return NextResponse.json({ ok: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: `RelanceFlow Support <noreply@relanceflow.fr>`,
      to: ['hello@relanceflow.fr'],
      reply_to: email,
      subject: `[Support] ${subject}`,
      text: `Nouveau message de support\n\nNom : ${name}\nEmail : ${email}\n\n${message}`,
      html: `<p><strong>Nom :</strong> ${name}<br><strong>Email :</strong> ${email}</p><hr><p>${message.replace(/\n/g, '<br>')}</p>`,
    })

    if (error) {
      console.error('Contact form send error:', error)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
