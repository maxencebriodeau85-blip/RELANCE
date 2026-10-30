import { NextResponse } from 'next/server'
import { isValidEmail } from '@/lib/validation'
import { getIp } from '@/lib/rate-limit'
import { distributedRateLimit } from '@/lib/distributed-rate-limit'
import { readJsonBody } from '@/lib/request-json'

const MAX_LENGTH = 5000

export async function POST(request: Request) {
  try {
    if (
      !process.env.RESEND_FROM_EMAIL ||
      !process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY.includes('placeholder') ||
      !process.env.SUPPORT_EMAIL
    )
      return NextResponse.json(
        { error: 'Le formulaire est momentanément indisponible. Écrivez-nous directement par email, à l’adresse indiquée sur cette page.' },
        { status: 503 },
      )
    // Rate limit: 5 messages per IP per hour.
    const rl = await distributedRateLimit('contact', getIp(request), 5, 3600)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Trop de messages. Réessayez dans ${rl.retryAfterSec}s.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const parsed = await readJsonBody(request, 16 * 1024)
    if (!parsed.ok)
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    const body = parsed.value as Record<string, unknown> | null
    if (!body)
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })

    const name = String(body.name || '')
      .trim()
      .slice(0, 100)
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
      .slice(0, 200)
    const subject =
      String(body.subject || '')
        .trim()
        .slice(0, 200) || 'Message via /contact'
    const message = String(body.message || '')
      .trim()
      .slice(0, MAX_LENGTH)
    const honeypot = String(body.website || '').trim() // hidden field

    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Nom requis'
    if (!email) errors.email = 'Email requis'
    else if (!isValidEmail(email)) errors.email = 'Email invalide'
    if (!message) errors.message = 'Message requis'
    else if (message.length < 10)
      errors.message = 'Message trop court (10 caractères min.)'

    // Honeypot — silently drop bot submissions
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation échouée', fields: errors },
        { status: 422 },
      )
    }

    // Send to support email via Resend
    const supportTo = process.env.SUPPORT_EMAIL!

    if (
      process.env.RESEND_API_KEY &&
      !process.env.RESEND_API_KEY.includes('placeholder')
    ) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL!

        // Strip CR/LF from name/subject to prevent header injection
        const safeName = name.replace(/[\r\n<>"]/g, '')
        const safeSubject = subject.replace(/[\r\n]/g, ' ')

        // API HTTP de Resend, comme pour les relances : pas de SDK à maintenir.
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Encair Contact <${fromEmail}>`,
            to: [supportTo],
            reply_to: email,
            subject: `[Contact] ${safeSubject}`,
            text: `Nouveau message via le formulaire de contact :\n\nNom : ${safeName}\nEmail : ${email}\n\n---\n\n${message}\n`,
            tags: [{ name: 'type', value: 'contact' }],
          }),
          signal: AbortSignal.timeout(10000),
        })
        const result = (await response.json().catch(() => null)) as { id?: string } | null
        if (!response.ok || !result?.id) throw new Error('Email not accepted')
      } catch (emailErr) {
        console.error('Contact email send error:', emailErr)
        return NextResponse.json(
          { error: "Impossible d'envoyer le message pour le moment." },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact route error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
