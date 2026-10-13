import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
export function SiteFooter() {
  return (
    <footer className="rf-footer">
      <div>
        <Logo size="sm" />
        <p>Gardez le fil. Retrouvez vos paiements.</p>
      </div>
      <nav aria-label="Navigation de pied de page">
        <Link href="/guides">Guides</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/cgu">Conditions</Link>
        <Link href="/privacy">Confidentialité</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
      </nav>
      <small>© {new Date().getFullYear()} Encair</small>
    </footer>
  )
}
