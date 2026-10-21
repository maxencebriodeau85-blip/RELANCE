import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  alternates: { canonical: '/auth/login' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
