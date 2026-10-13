import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Une question sur Encair ? Écrivez directement au fondateur. Réponse en général sous 48 h ouvrées.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
