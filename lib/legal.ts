/**
 * Informations légales de l'éditeur — UN SEUL ENDROIT à compléter.
 *
 * Chaque valeur se renseigne de préférence dans les variables d'environnement
 * Vercel (Settings → Environment Variables), sans toucher au code :
 *
 *   PUBLISHER_NAME           Prénom Nom de l'entrepreneur individuel
 *   PUBLISHER_ADDRESS        Adresse professionnelle (ou de domiciliation)
 *   PUBLISHER_SIREN          SIREN, dès l'immatriculation
 *   PUBLISHER_PHONE          Téléphone
 *   PUBLISHER_VAT_EXEMPT     "true" en franchise en base de TVA (art. 293 B du CGI)
 *   PUBLISHER_COURT          Tribunal compétent (ex. « Tribunal de commerce de Niort »)
 *   NEXT_PUBLIC_CONTACT_EMAIL Adresse de contact affichée sur le site
 *
 * Une valeur manquante s'affiche « à renseigner » sur les pages légales et
 * est listée par `missingPublisherFields()` — le site ne doit pas être
 * présenté à des prospects tant que cette liste n'est pas vide.
 */

/** Version des CGU/CGV — à incrémenter à chaque modification substantielle. */
export const TERMS_VERSION = '2026-10-13'
export const LEGAL_LAST_UPDATED = '13 octobre 2026'

const env = (key: string): string | null => {
  const v = process.env[key]?.trim()
  return v ? v : null
}

export const PUBLISHER = {
  name: env('PUBLISHER_NAME') ?? 'Maxence Briodeau',
  legalForm: 'entrepreneur individuel (EI)',
  tradeName: 'Encair',
  address: env('PUBLISHER_ADDRESS'),
  siren: env('PUBLISHER_SIREN'),
  phone: env('PUBLISHER_PHONE'),
  vatExempt: (env('PUBLISHER_VAT_EXEMPT') ?? 'true') === 'true',
  court: env('PUBLISHER_COURT'),
} as const

// Référence littérale : Next.js n'injecte côté navigateur que les
// `process.env.NEXT_PUBLIC_…` écrits en toutes lettres.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null

export const VAT_MENTION = PUBLISHER.vatExempt
  ? 'TVA non applicable, art. 293 B du CGI'
  : 'TVA au taux en vigueur en sus'

export function missingPublisherFields(): string[] {
  const missing: string[] = []
  if (!PUBLISHER.address) missing.push('PUBLISHER_ADDRESS')
  if (!PUBLISHER.siren) missing.push('PUBLISHER_SIREN')
  if (!PUBLISHER.phone) missing.push('PUBLISHER_PHONE')
  if (!CONTACT_EMAIL) missing.push('NEXT_PUBLIC_CONTACT_EMAIL')
  if (!process.env.HOST_PHONE?.trim()) missing.push('HOST_PHONE')
  return missing
}

/** Hébergeur (LCEN). Coordonnées publiées par Vercel sur vercel.com/legal. */
export const HOST = {
  name: 'Vercel Inc.',
  address: '440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
  // Téléphone exigé par la LCEN : à reprendre sur vercel.com/legal.
  phone: process.env.HOST_PHONE?.trim() || null,
  site: 'https://vercel.com',
  note: 'Fonctions serveur exécutées dans la région Paris (cdg1).',
} as const

/** Sous-traitants ultérieurs — liste reprise par /privacy et /dpa. */
export const SUBPROCESSORS = [
  {
    name: 'Vercel Inc.',
    country: 'États-Unis',
    purpose: 'Hébergement du site et de l’application',
    location: 'Fonctions serveur en région Paris (cdg1) ; réseau mondial de diffusion',
    safeguard: 'Data Privacy Framework UE–États-Unis et clauses contractuelles types',
  },
  {
    name: 'Supabase, Inc.',
    country: 'États-Unis',
    purpose: 'Base de données et authentification',
    location: 'Union européenne (Suède, région eu-north-1)',
    safeguard: 'Clauses contractuelles types (accès éventuel depuis les États-Unis)',
  },
  {
    name: 'Resend',
    country: 'États-Unis',
    purpose: 'Envoi des emails (compte, contact et relances de vos clients)',
    location: 'États-Unis',
    safeguard: 'Clauses contractuelles types',
  },
  {
    name: 'Stripe Payments Europe Ltd',
    country: 'Irlande',
    purpose: 'Paiement de l’abonnement Encair',
    location: 'Union européenne, avec transferts vers Stripe, Inc. (États-Unis)',
    safeguard: 'Data Privacy Framework UE–États-Unis et clauses contractuelles types',
  },
] as const
