/** Public offer. Legacy plan keys remain readable for existing subscriptions. */
export const OFFER = {
  key: 'starter',
  name: 'Fondateur',
  price: 16,
  publicPrice: 29,
  invoiceLimit: 100,
  trialDays: 30,
  features: [
    '100 nouvelles factures par mois',
    'Import CSV et actualisation des soldes',
    'Relances email et modèles personnalisables',
    'Suivi des promesses et des litiges',
    'Historique et export CSV',
  ],
} as const
export const PLAN_LIMITS: Record<string, number> = {
  free_trial: 10,
  starter: OFFER.invoiceLimit,
  pro: 200,
  business: 1000,
}
