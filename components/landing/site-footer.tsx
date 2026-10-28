import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { CONTACT_EMAIL } from '@/lib/legal'

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Produit',
    links: [
      { href: '/#fonctionnalites', label: 'Fonctionnalités' },
      { href: '/#pricing', label: 'Tarif' },
      { href: '/securite', label: 'Sécurité et données' },
      { href: '/api-docs', label: 'API' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { href: '/guides', label: 'Guides' },
      { href: '/modeles', label: 'Modèles de relance' },
      { href: '/calculateur-penalites', label: 'Calculateur de pénalités' },
    ],
  },
  {
    title: 'Encair',
    links: [
      { href: '/about', label: 'À propos' },
      { href: '/contact', label: 'Contact' },
      { href: '/#faq', label: 'Questions fréquentes' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { href: '/cgu', label: 'CGU/CGV' },
      { href: '/privacy', label: 'Confidentialité' },
      { href: '/dpa', label: 'Sous-traitance (RGPD)' },
      { href: '/mentions-legales', label: 'Mentions légales' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="rf-footer rf-footer-grid">
      <div className="rf-footer-brand">
        <Logo size="sm" />
        <p>Le suivi des factures impayées pour les TPE.</p>
        <p>Base de données hébergée dans l’Union européenne.</p>
      </div>
      <nav aria-label="Pied de page" className="rf-footer-cols">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="rf-footer-title">{column.title}</p>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="rf-footer-bottom">
        <small>© {new Date().getFullYear()} Encair</small>
        {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <Link href="/contact">Nous écrire</Link>}
      </div>
    </footer>
  )
}
