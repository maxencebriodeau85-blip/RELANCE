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

// Canonical & metadata URL — always points to the production domain so that
// Open Graph cards, JSON-LD, canonical and sitemap never leak a Vercel preview
// hostname. If you change the production domain, edit this constant
// (NOT the NEXT_PUBLIC_APP_URL env var, which controls runtime links inside
// emails — that one should also be set to https://relanceflow.fr in prod).
const SITE_URL = 'https://relanceflow.fr'

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

// JSON-LD SoftwareApplication.
// NOTE: aggregateRating intentionally absent — we don't have a real measured
// rating yet. Putting "4.8 / 30 reviews" would be invented data; Google's
// structured-data guidelines forbid that and it sabotages credibility.
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* DNS prefetch + TCP preconnect to third parties used on first paint —
            shaves ~100-200ms off LCP on a fresh visit. */}
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        {/* Skip-to-main link — visible on keyboard focus only.
            Lets keyboard / screen-reader users bypass the nav. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:text-white focus:font-semibold focus:text-sm focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Aller au contenu principal
        </a>
        {children}
        <Toaster />
        <CookieBanner />
      </body>
    </html>
  )
}
