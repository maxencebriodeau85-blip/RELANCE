import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
export function SiteFooter() {
  return (
    <footer className="rf-footer">
      <div>
        <Logo size="sm" />
        <p>Le suivi des factures impayées pour les TPE.</p>
      </div>
      <nav aria-label="Navigation de pied de page">
        <Link href="/guides">Guides</Link>
        <Link href="/calculateur-penalites">Calculateur de pénalités</Link>
        <Link href="/modeles">Modèles de relance</Link>
        <Link href="/about">À propos</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/cgu">CGU/CGV</Link>
        <Link href="/dpa">Sous-traitance</Link>
        <Link href="/privacy">Confidentialité</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
      </nav>
      <small>© {new Date().getFullYear()} Encair</small>
    </footer>
  )
}
