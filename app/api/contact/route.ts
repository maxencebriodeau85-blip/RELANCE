import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isValidEmail } from '@/lib/validation'
import { getIp } from '@/lib/rate-limit'
import { distributedRateLimit } from '@/lib/distributed-rate-limit'
import { readJsonBody } from '@/lib/request-json'

const MAX_LENGTH = 5000

export async function POST(request: Request) {
  const reference = randomUUID()
  const respond = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
    NextResponse.json({ ...body, reference }, { status, headers })
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const supportTo = process.env.SUPPORT_EMAIL?.trim()
    if (!fromEmail || !apiKey || apiKey.includes('placeholder') || !supportTo) {
      console.warn('Contact delivery', { event: 'configuration_unavailable', reference })
      return respond(
        { error: 'Le formulaire est momentanément indisponible. Écrivez-nous directement par email, à l’adresse indiquée sur cette page.' },
        503,
      )
    }
    // Rate limit: 5 messages per IP per hour.
    const rl = await distributedRateLimit('contact', getIp(request), 5, 3600)
    if (!rl.allowed)
      return respond(
        { error: `Trop de messages. Réessayez dans ${rl.retryAfterSec}s.` },
        429, { 'Retry-After': String(rl.retryAfterSec) },
      )

    const parsed = await readJsonBody(request, 16 * 1024)
    if (!parsed.ok) return respond({ error: parsed.error }, parsed.status)
    const body = parsed.value as Record<string, unknown> | null
    if (!body) return respond({ error: 'Corps invalide' }, 400)

    const name = String(body.name || '').trim().slice(0, 100)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)
    const subject = String(body.subject || '').trim().slice(0, 200) || 'Message via /contact'
    const message = String(body.message || '').trim().slice(0, MAX_LENGTH)
    const honeypot = String(body.website || '').trim()

    // Autofill can fill an offscreen field too. Never claim delivery for a dropped submission.
    if (honeypot) {
      console.warn('Contact delivery', { event: 'submission_rejected', reference })
      return respond({ error: 'Le message n’a pas été envoyé. Votre texte est conservé : réessayez ou utilisez l’adresse email affichée.' }, 422)
    }
    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Nom requis'
    if (!email) errors.email = 'Email requis'
    else if (!isValidEmail(email)) errors.email = 'Email invalide'
    if (!message) errors.message = 'Message requis'
    else if (message.length < 10) errors.message = 'Message trop court (10 caractères min.)'
    if (Object.keys(errors).length > 0)
      return respond({ error: 'Validation échouée', fields: errors }, 422)

    // Strip CR/LF from name/subject to prevent header injection.
    const safeName = name.replace(/[\r\n<>"]/g, '')
    const safeSubject = subject.replace(/[\r\n]/g, ' ')
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Encair Contact <${fromEmail}>`, to: [supportTo], reply_to: email,
          subject: `[Contact] ${safeSubject}`,
          text: `Nouveau message via le formulaire de contact :\n\nNom : ${safeName}\nEmail : ${email}\n\n---\n\n${message}\n`,
          tags: [{ name: 'type', value: 'contact' }],
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        console.warn('Contact delivery', { event: 'provider_rejected', reference, status: response.status })
        return respond({ error: "Le service d’envoi a refusé le message. Votre texte est conservé ; utilisez l’adresse email affichée." }, 502)
      }
      const result: unknown = await response.json().catch(() => null)
      const providerId = result && typeof result === 'object' && 'id' in result ? result.id : null
      if (typeof providerId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId)) {
        console.warn('Contact delivery', { event: 'provider_response_invalid', reference })
        return respond({ error: 'La prise en charge du message n’a pas pu être confirmée. Votre texte est conservé. Utilisez la référence ci-dessous pour vérifier avant de renvoyer.' }, 502)
      }
      // Operational metadata only: never log the submitted text, addresses, key or raw response.
      console.info('Contact delivery', { event: 'accepted', reference, providerId })
      return respond({ success: true, delivery: 'accepted' })
    } catch {
      console.warn('Contact delivery', { event: 'provider_unconfirmed', reference })
      return respond({ error: 'La prise en charge du message n’a pas pu être confirmée. Votre texte est conservé. Utilisez la référence ci-dessous pour vérifier avant de renvoyer.' }, 502)
    }
  } catch {
    console.error('Contact delivery', { event: 'internal_error', reference })
    return respond({ error: 'Erreur serveur. Votre texte est conservé.' }, 500)
  }
}
