/** Public offer. Legacy plan keys remain readable for existing subscriptions. */
export const OFFER = {
  key: 'starter',
  name: 'Fondateur',
  price: 16,
  publicPrice: 29,
  invoiceLimit: 100,
  trialDays: 30,
  trialInvoiceLimit: 10,
  /** Franchise en base de TVA (art. 293 B du CGI) : prix affichés sans « HT ». */
  vatExempt: true,
  features: [
    '100 nouvelles factures par mois',
    'Import CSV et actualisation des soldes',
    'Relances email et modèles personnalisables',
    'Suivi des promesses et des litiges',
    'Historique et export CSV',
  ],
} as const
/** Suffixe fiscal des prix : vide en franchise de TVA, « HT » sinon. */
export const PRICE_TAX = OFFER.vatExempt ? '' : ' HT'

/** Prix lisible : « 16 €/mois » (franchise) ou « 16 € HT/mois ». `per` vaut '/mois' ou ' par mois'. */
export function priceLabel(amount: number, per: '/mois' | ' par mois' = '/mois'): string {
  return `${amount} €${PRICE_TAX}${per}`
}

/** Mention à côté des prix. */
export const VAT_NOTE = OFFER.vatExempt ? 'TVA non applicable, art. 293 B du CGI' : 'TVA en sus au taux en vigueur'

/** Formulation unique de l'essai, à réutiliser partout sur le site. */
export const TRIAL_LINE = `${OFFER.trialDays} jours gratuits · ${OFFER.trialInvoiceLimit} factures · sans carte bancaire · aucun prélèvement automatique`

/** Libellé unique des boutons d'inscription. */
export const CTA_LABEL = `Essayer ${OFFER.trialDays} jours gratuitement`

export const PLAN_LIMITS: Record<string, number> = {
  free_trial: OFFER.trialInvoiceLimit,
  starter: OFFER.invoiceLimit,
  pro: 200,
  business: 1000,
}

/**
 * Stripe Checkout exige une fin d’essai au moins 48 h dans le futur ; une
 * heure de marge couvre le temps passé sur la page de paiement.
 */
export const MIN_TRIAL_CARRYOVER_MS = 49 * 3_600_000

/**
 * Fin d’essai Encair à reporter sur l’abonnement Stripe, en secondes Unix :
 * un compte en essai qui s’abonne garde ses jours gratuits restants et n’est
 * prélevé qu’à la fin de l’essai. `null` : paiement immédiat (essai terminé,
 * ou trop proche de sa fin pour Stripe).
 */
export function trialCarryoverEnd(
  profile: { plan?: string | null; trial_ends_at?: string | null } | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!profile || profile.plan !== 'free_trial' || !profile.trial_ends_at) return null
  const end = Date.parse(profile.trial_ends_at)
  if (!Number.isFinite(end) || end - now < MIN_TRIAL_CARRYOVER_MS) return null
  return Math.floor(end / 1000)
}
