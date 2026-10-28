import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Calculateur de pénalités de retard — outil gratuit',
  description:
    'Calculez les pénalités de retard entre professionnels (taux BCE du semestre + 10 points) et l’indemnité forfaitaire de 40 € dues sur une facture impayée. Outil gratuit.',
  path: '/calculateur-penalites',
  ogTitle: 'Calculateur gratuit de pénalités de retard',
})

export default function CalculateurLayout({ children }: { children: React.ReactNode }) {
  return children
}
