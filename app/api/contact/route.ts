import { NextResponse } from 'next/server'

const MAX_LENGTH = 5000

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })

    const name = String(body.name || '').trim().slice(0, 100)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
    const subject = String(body.subject || '').trim().slice(0, 200) || 'Message via /contact'
    const message = String(body.message || '').trim().slice(0, MAX_LENGTH)
    const honeypot = String(body.website || '').trim() // hidden field

    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Nom requis'
    if (!email) errors.email = 'Email requis'
    else if (!isValidEmail(email)) errors.email = 'Email invalide'
    if (!message) errors.message = 'Message requis'
    else if (message.length < 10) errors.message = 'Message trop court (10 caractères min.)'

    // Honeypot — silently drop bot submissions
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation échouée', fields: errors }, { status: 422 })
    }

    // Send to support email via Resend
    const supportTo = process.env.SUPPORT_EMAIL || 'hello@relanceflow.fr'

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@relanceflow.fr'

        // Strip CR/LF from name/subject to prevent header injection
        const safeName = name.replace(/[\r\n<>"]/g, '')
        const safeSubject = subject.replace(/[\r\n]/g, ' ')

        await resend.emails.send({
          from: `RelanceFlow Contact <${fromEmail}>`,
          to: [supportTo],
          reply_to: email,
          subject: `[Contact] ${safeSubject}`,
          text: `Nouveau message via le formulaire de contact :\n\nNom : ${safeName}\nEmail : ${email}\n\n---\n\n${message}\n`,
          tags: [{ name: 'type', value: 'contact' }],
        })
      } catch (emailErr) {
        console.error('Contact email send error:', emailErr)
        return NextResponse.json({ error: "Impossible d'envoyer le message pour le moment." }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact route error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
