import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte',
  alternates: { canonical: '/auth/register' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
