import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calculateur de pénalités de retard — outil gratuit',
  description:
    "Calculez en 1 minute les pénalités de retard légales (taux BCE + 10 points) et l'indemnité forfaitaire de 40 € dues sur une facture impayée. Outil gratuit conforme au Code de commerce français.",
  alternates: { canonical: '/calculateur-penalites' },
  openGraph: {
    title: 'Calculateur gratuit de pénalités de retard | RelanceFlow',
    description:
      "Combien votre client doit-il vraiment en pénalités ? Calcul instantané conforme à l'art. L441-10 C.com.",
    type: 'website',
  },
}

export default function CalculateurLayout({ children }: { children: React.ReactNode }) {
  return children
}
