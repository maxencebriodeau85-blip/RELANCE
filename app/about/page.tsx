import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import Link from 'next/link'
export const metadata = { title: 'Pourquoi Encair ?' }
export default function About() {
  return (
    <div className="rf-site">
      <SiteNav />
      <main id="main-content" className="rf-section max-w-3xl">
        <span className="rf-eyebrow">POURQUOI ENCAIR</span>
        <h1 className="text-5xl font-medium tracking-tight">
          Garder le fil,
          <br />
          jusqu’au paiement.
        </h1>
        <p className="rf-lead">
          Une facture en retard entraîne souvent plusieurs échanges. Un rappel,
          une promesse, un justificatif à renvoyer. Encair rassemble ce suivi
          dans un espace simple.
        </p>
        <p className="mb-8 leading-relaxed text-gray-500">
          Vous gardez votre logiciel de facturation. Vous importez les factures
          à suivre, confirmez les soldes et choisissez quand relancer. Les
          litiges et les promesses restent visibles pour préparer la bonne
          action.
        </p>
        <Link href="/auth/register" className="rf-button rf-button-dark">
          Essayer Encair pendant 30 jours →
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
