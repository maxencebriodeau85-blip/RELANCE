import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RelanceFlow – Recouvrement automatisé pour TPE/PME',
  description:
    'Encaissez 15 jours plus tôt, sans relancer un seul client à la main. La solution de recouvrement amiable automatisée pour les TPE et PME françaises.',
  keywords: ['recouvrement', 'relance client', 'factures impayées', 'TPE', 'PME', 'SaaS'],
  authors: [{ name: 'RelanceFlow' }],
  openGraph: {
    title: 'RelanceFlow – Recouvrement automatisé',
    description: 'Encaissez 15 jours plus tôt, sans relancer un seul client à la main.',
    type: 'website',
    locale: 'fr_FR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
