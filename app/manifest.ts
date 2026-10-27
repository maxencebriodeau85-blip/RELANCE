import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Encair — Suivi des impayés et relances',
    short_name: 'Encair',
    description:
      'Suivi des impayés, soldes, relances email, promesses de paiement et litiges.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#182b40',
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
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
