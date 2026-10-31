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
