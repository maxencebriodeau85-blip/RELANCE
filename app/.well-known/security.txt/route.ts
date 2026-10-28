import { getAppUrl } from '@/lib/app-url'
import { CONTACT_EMAIL } from '@/lib/legal'

// RFC 9116 : coordonnées pour signaler une faille de sécurité.
// L'échéance glisse (180 jours) : le fichier reste valide tant que le site
// est déployé, et l'adresse suit NEXT_PUBLIC_CONTACT_EMAIL.
export const revalidate = 86400

export function GET() {
  const site = getAppUrl()
  const expires = new Date(Date.now() + 180 * 24 * 3600 * 1000)
  expires.setUTCHours(0, 0, 0, 0)
  const body = [
    `Contact: ${CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : `${site}/contact`}`,
    `Expires: ${expires.toISOString()}`,
    'Preferred-Languages: fr, en',
    `Canonical: ${site}/.well-known/security.txt`,
    `Policy: ${site}/securite#signaler`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
