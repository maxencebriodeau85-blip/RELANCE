import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'
import { pageMetadata } from '@/lib/seo'
import { CTA_LABEL } from '@/lib/plans'
import { CONTACT_EMAIL, PUBLISHER } from '@/lib/legal'

export const metadata = pageMetadata({
  title: 'À propos',
  description:
    'Pourquoi Encair existe, qui le développe et les principes qui guident le produit : aucune relance sans solde vérifié, vos données exportables à tout moment.',
  path: '/about',
})

const PRINCIPLES = [
  {
    title: 'Aucune relance sans solde vérifié',
    text: 'Les factures importées arrivent en pause. Une promesse, un litige ou un solde non confirmé depuis sept jours suspend l’envoi automatique.',
  },
  {
    title: 'Votre logiciel de facturation reste le même',
    text: 'Encair ne remplace pas votre outil : il suit ce qui reste à encaisser, à partir d’un simple export CSV.',
  },
  {
    title: 'Vos données restent les vôtres',
    text: 'Export CSV de vos factures et export complet de votre compte en libre-service, à tout moment, y compris après l’essai.',
  },
]

export default function About() {
  return (
    <PublicPage>
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head">
          <span className="rf-eyebrow">À propos</span>
          <h1>Savoir qui relancer, et quand.</h1>
          <p>
            Une facture en retard entraîne souvent plusieurs échanges : un rappel, une promesse, un
            justificatif à renvoyer. Encair rassemble ce suivi dans un seul espace, pour que chaque
            relance tienne compte de ce que votre client vous a dit.
          </p>
        </header>

        <section aria-labelledby="fondateur" className="rf-prose">
          <h2 id="fondateur">Qui est derrière</h2>
          <p>
            Encair est développé par {PUBLISHER.name}, seul, en parallèle de ses études d’expertise
            comptable (DSCG) et de son alternance en cabinet. C’est là qu’il voit chaque semaine des
            petites entreprises perdre du temps à relancer, faute de savoir qui a promis quoi.
          </p>
          <p>
            Le produit est en lancement : il n’a pas encore de clients, et les premiers utilisateurs
            orienteront la suite. Une question, une remarque :{' '}
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            ) : (
              <Link href="/contact">formulaire de contact</Link>
            )}
            .
          </p>
        </section>

        <section aria-labelledby="principes" className="mt-14">
          <h2 id="principes" className="rf-h2 mb-6">Trois principes</h2>
          <ol className="grid grid-cols-1 gap-4">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="rf-card flex gap-5 p-6">
                <span className="text-sm font-semibold text-[#a74a28]" aria-hidden="true">0{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-[#182b40]">{p.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#4e5b68]">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/securite" className="rf-arrow-link mt-6">
            Sécurité et protection des données <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-6">
          <Link href="/auth/register" className="rf-button rf-button-dark">
            {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/contact" className="rf-arrow-link">
            Poser une question <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </PublicPage>
  )
}
