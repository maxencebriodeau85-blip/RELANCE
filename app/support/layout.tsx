import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — FAQ et contact',
  description:
    "Réponses aux questions fréquentes sur RelanceFlow (import CSV, personnalisation des emails, résiliation, sécurité) et formulaire de contact direct.",
  alternates: { canonical: '/support' },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
