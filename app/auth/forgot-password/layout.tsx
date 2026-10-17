import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  alternates: { canonical: '/auth/forgot-password' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
