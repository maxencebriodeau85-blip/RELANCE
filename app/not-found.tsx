import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
}

const SUGGESTIONS = [
  { href: '/#fonctionnalites', label: 'Découvrir Encair', text: 'Import CSV, relances et suivi des promesses.' },
  { href: '/guides', label: 'Lire les guides', text: 'Mise en demeure, pénalités, prescription…' },
  { href: '/calculateur-penalites', label: 'Calculer des pénalités', text: 'Intérêts de retard et indemnité de 40 €.' },
  { href: '/contact', label: 'Nous écrire', text: 'Une question ? Réponse sous 48 h ouvrées.' },
]

export default function NotFound() {
  return (
    <PublicPage>
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Erreur 404</span>
          <h1>Cette page n’existe pas ou a été déplacée.</h1>
          <p>Vérifiez l’adresse, ou repartez de l’une de ces pages.</p>
        </header>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="rf-card group h-full flex-col gap-1 p-5">
                <span className="rf-arrow-link">
                  {item.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-[#4e5b68]">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="rf-button rf-button-dark mt-10">
          Retour à l’accueil
        </Link>
      </div>
    </PublicPage>
  )
}
