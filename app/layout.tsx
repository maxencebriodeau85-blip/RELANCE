import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RelanceFlow – Pipeline, relances et facturation pour indépendants',
  description:
    'Ne laisse plus aucun deal mourir en silence. Pipeline kanban, relances automatiques prospects & factures, facturation intégrée — pour consultants et coaches indépendants.',
  keywords: ['pipeline', 'relance client', 'facturation', 'consultant', 'coach', 'indépendant', 'CRM', 'SaaS'],
  authors: [{ name: 'RelanceFlow' }],
  openGraph: {
    title: 'RelanceFlow – Pipeline, relances et facturation pour indépendants',
    description: 'Ne laisse plus aucun deal mourir en silence. 14 jours gratuits, sans carte bancaire.',
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
