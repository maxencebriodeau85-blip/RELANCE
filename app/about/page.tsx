import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import { CTA_LABEL } from '@/lib/plans'
import { CONTACT_EMAIL, PUBLISHER } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'À propos',
  description:
    'Pourquoi Encair existe, qui le développe et où en est le projet.',
  alternates: { canonical: '/about' },
}

export default function About() {
  return (
    <div className="rf-site">
      <SiteNav />
      <main id="main-content" className="rf-section max-w-3xl">
        <span className="rf-eyebrow">À PROPOS</span>
        <h1 className="text-5xl font-medium tracking-tight">
          Savoir qui relancer,
          <br />
          et quand.
        </h1>
        <p className="rf-lead">
          Une facture en retard entraîne souvent plusieurs échanges : un rappel,
          une promesse, un justificatif à renvoyer. Encair rassemble ce suivi
          dans un seul espace.
        </p>
        <p className="mb-6 leading-relaxed text-gray-500">
          Vous gardez votre logiciel de facturation. Vous importez les factures
          à suivre, confirmez les soldes et choisissez quand relancer. Les
          litiges et les promesses restent visibles pour préparer la bonne
          action.
        </p>
        <h2 className="text-2xl font-medium tracking-tight mt-10 mb-4">Qui est derrière</h2>
        <p className="mb-4 leading-relaxed text-gray-500">
          Encair est développé par {PUBLISHER.name}, seul, en parallèle de ses
          études d’expertise comptable (DSCG) et de son alternance en cabinet.
          C’est là qu’il voit chaque semaine des petites entreprises perdre du
          temps à relancer, faute de savoir qui a promis quoi.
        </p>
        <p className="mb-8 leading-relaxed text-gray-500">
          Le produit est en lancement : il n’a pas encore de clients, et les
          premiers utilisateurs orienteront la suite. Une question, une
          remarque :{' '}
          {CONTACT_EMAIL ? (
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          ) : (
            <Link className="underline" href="/contact">formulaire de contact</Link>
          )}
          .
        </p>
        <Link href="/auth/register" className="rf-button rf-button-dark">
          {CTA_LABEL} →
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
