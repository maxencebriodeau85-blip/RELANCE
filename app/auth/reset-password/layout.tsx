import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  alternates: { canonical: '/auth/reset-password' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
