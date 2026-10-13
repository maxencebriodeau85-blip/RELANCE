import { getAppUrl } from '@/lib/app-url'
import { OFFER } from '@/lib/plans'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { CookieBanner } from '@/components/cookie-banner'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ScrollProgress } from '@/components/effects/scroll-progress'

// DA 2026-07 : Inter unique, graisses 400/500/600/700.
// La même variable alimente --font-body ET --font-display (globals.css).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Canonical URLs follow the configured, owned deployment domain.
const SITE_URL = getAppUrl()

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Encair — Automatisez vos relances de factures impayées',
    template: '%s | Encair',
  },
  description:
    'Logiciel français de relance automatique des factures impayées pour indépendants, consultants et TPE. Import CSV, relances email et suivi des paiements. Tarif fondateur à 16 € HT/mois. 30 jours gratuits, sans carte bancaire.',
  keywords: [
    'relance facture impayée',
    'logiciel recouvrement',
    'relance client automatique',
    'mise en demeure',
    'facture impayée que faire',
    'pénalités de retard',
    'suivi des impayés',
    'facturation indépendant',
    'consultant',
    'coach',
    'freelance',
    'TPE',
    'auto-entrepreneur',
  ],
  authors: [{ name: 'Encair' }],
  creator: 'Encair',
  publisher: 'Encair',
  applicationName: 'Encair',
  category: 'business',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Encair — Automatisez vos relances de factures impayées',
    description:
      'Logiciel français de relance automatique des factures impayées pour indépendants et TPE. Import CSV, relances email et suivi des paiements. Tarif fondateur à 16 € HT/mois. 30 jours gratuits.',
    url: SITE_URL,
    siteName: 'Encair',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Encair — Automatisez vos relances de factures impayées',
    description:
      'Logiciel français de relance automatique pour indépendants et TPE. 30 jours gratuits.',
  },
  robots: {
    index: process.env.VERCEL_ENV !== 'preview',
    follow: true,
    googleBot: {
      index: process.env.VERCEL_ENV !== 'preview',
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
  name: 'Encair',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    "Suivi des impayés, import CSV et relances email pour les petites entreprises.",
  url: SITE_URL,
  inLanguage: 'fr-FR',
  offers: [{ '@type': 'Offer', name: OFFER.name, price: String(OFFER.price), priceCurrency: 'EUR' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
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
        <ScrollProgress />
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
        {/* Cookie-less analytics + Core Web Vitals — served from *.vercel-scripts.com,
            allowed by CSP in next.config.js. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
