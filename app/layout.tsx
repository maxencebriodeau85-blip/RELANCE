import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { CookieBanner } from '@/components/cookie-banner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://relanceflow.fr'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'RelanceFlow — Automatisez vos relances de factures impayées',
    template: '%s | RelanceFlow',
  },
  description:
    'Logiciel français de relance automatique des factures impayées pour indépendants, consultants et TPE. Pipeline CRM, mise en demeure conforme, paiement Stripe intégré. 30 jours gratuits, sans carte bancaire.',
  keywords: [
    'relance facture impayée',
    'logiciel recouvrement',
    'relance client automatique',
    'mise en demeure',
    'facture impayée que faire',
    'pénalités de retard',
    'pipeline CRM français',
    'facturation indépendant',
    'consultant',
    'coach',
    'freelance',
    'TPE',
    'auto-entrepreneur',
  ],
  authors: [{ name: 'RelanceFlow' }],
  creator: 'RelanceFlow',
  publisher: 'RelanceFlow',
  applicationName: 'RelanceFlow',
  category: 'business',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'RelanceFlow — Automatisez vos relances de factures impayées',
    description:
      'Logiciel français de relance automatique des factures impayées pour indépendants et TPE. Pipeline CRM, mise en demeure conforme, paiement Stripe intégré. 30 jours gratuits.',
    url: SITE_URL,
    siteName: 'RelanceFlow',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RelanceFlow — Automatisez vos relances de factures impayées',
    description:
      'Logiciel français de relance automatique pour indépendants et TPE. 30 jours gratuits.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
}

// JSON-LD structured data for SoftwareApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RelanceFlow',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    "Logiciel français d'automatisation des relances de factures impayées et de génération de mises en demeure conformes au droit français.",
  url: SITE_URL,
  inLanguage: 'fr-FR',
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '19', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Business', price: '99', priceCurrency: 'EUR' },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '30',
    bestRating: '5',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        {children}
        <Toaster />
        <CookieBanner />
      </body>
    </html>
  )
}
