/** Public offer. Legacy plan keys remain readable for existing subscriptions. */
export const OFFER = {
  key: 'starter',
  name: 'Fondateur',
  price: 16,
  publicPrice: 29,
  invoiceLimit: 100,
  trialDays: 30,
  trialInvoiceLimit: 10,
  features: [
    '100 nouvelles factures par mois',
    'Import CSV et actualisation des soldes',
    'Relances email et modèles personnalisables',
    'Suivi des promesses et des litiges',
    'Historique et export CSV',
  ],
} as const
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
