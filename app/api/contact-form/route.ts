import { NextResponse } from 'next/server'
import { escapeHtml, isValidEmail } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const name = String(body.name || '').trim().slice(0, 200)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
    const subject = String(body.subject || '').trim().slice(0, 200)
    const message = String(body.message || '').trim().slice(0, 5000)

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 422 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || apiKey.includes('placeholder')) {
      console.log('[Contact form - DRY RUN]', { name, email, subject })
      return NextResponse.json({ ok: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    // Escape every user-controlled field before injecting into HTML body (XSS).
    const eName = escapeHtml(name)
    const eEmail = escapeHtml(email)
    const eMessage = escapeHtml(message).replace(/\n/g, '<br>')

    // Strip CR/LF from subject to prevent email header injection.
    const safeSubject = subject.replace(/[\r\n]/g, ' ')

    const { error } = await resend.emails.send({
      from: `RelanceFlow Support <noreply@relanceflow.fr>`,
      to: ['hello@relanceflow.fr'],
      reply_to: email,
      subject: `[Support] ${safeSubject}`,
      text: `Nouveau message de support\n\nNom : ${name}\nEmail : ${email}\n\n${message}`,
      html: `<p><strong>Nom :</strong> ${eName}<br><strong>Email :</strong> ${eEmail}</p><hr><p>${eMessage}</p>`,
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
