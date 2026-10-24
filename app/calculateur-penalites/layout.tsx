import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculateur de pénalités de retard — outil gratuit',
  description:
    "Calculez les pénalités de retard entre professionnels (taux BCE du semestre + 10 points) et l'indemnité forfaitaire de 40 € dues sur une facture impayée. Outil gratuit.",
  alternates: { canonical: '/calculateur-penalites' },
  openGraph: {
    title: 'Calculateur gratuit de pénalités de retard',
    description:
      "Combien votre client professionnel doit-il en pénalités ? Calcul selon l'art. L441-10 du Code de commerce.",
    type: 'website',
  },
}

export default function CalculateurLayout({ children }: { children: React.ReactNode }) {
  return children
}
