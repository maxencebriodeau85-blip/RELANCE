import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — parle directement au fondateur',
  description:
    "Une question, un bug, une feature manquante ? Écris directement au fondateur de Encair. Réponse sous 24 h ouvrées, jamais de chatbot.",
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | Encair',
    description: 'Écris directement au fondateur — pas de chatbot, pas de niveau 1.',
    type: 'website',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
