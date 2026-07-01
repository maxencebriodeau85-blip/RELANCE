import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RelanceFlow — Recouvrement de factures pour indépendants',
    short_name: 'RelanceFlow',
    description:
      'Logiciel français de relance automatique des factures impayées. Pipeline CRM, mise en demeure conforme, paiement Stripe intégré.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#6B8CFF',
    lang: 'fr-FR',
    orientation: 'portrait-primary',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
