import { getAppUrl } from '@/lib/app-url'
import { OFFER } from '@/lib/plans'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { CookieBanner } from '@/components/cookie-banner'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ScrollProgress } from '@/components/effects/scroll-progress'

// DA 2026-07 : Inter unique, graisses 400/500/600/700.
// La même variable alimente --font-body ET --font-display (globals.css).
// Police embarquée (Inter variable, sous-ensemble latin, licence OFL dans
// app/fonts) : le build ne dépend plus du téléchargement Google Fonts.
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-body',
  display: 'swap',
  weight: '400 700',
})

// Canonical URLs follow the configured, owned deployment domain.
const SITE_URL = getAppUrl()

const TITLE = 'Encair — Suivi et relance des factures impayées pour TPE'
const DESCRIPTION =
  'Import CSV depuis votre logiciel de facturation, relances email, promesses de paiement et litiges. Pour les TPE. 30 jours gratuits, sans carte bancaire.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | Encair',
  },
  description: DESCRIPTION,
  authors: [{ name: 'Encair' }],
  creator: 'Encair',
  publisher: 'Encair',
  applicationName: 'Encair',
  category: 'business',
  // Pas de canonical ici : chaque page déclare la sienne (sinon toutes
  // les pages hériteraient de la canonical de l'accueil).
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Encair',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
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
  offers: [
    {
      '@type': 'Offer',
      name: OFFER.name,
      price: String(OFFER.price),
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(OFFER.price),
        priceCurrency: 'EUR',
        unitText: 'mois',
        valueAddedTaxIncluded: false,
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Stripe n'est chargé que sur la page d'abonnement : pas de preconnect global. */}
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
