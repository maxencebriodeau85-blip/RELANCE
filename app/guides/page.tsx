import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Calculator, Clock, Mail } from 'lucide-react'
import { GUIDES } from '@/lib/guides-content'
import { PublicPage } from '@/components/landing/public-page'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo'
import { CTA_LABEL, TRIAL_LINE } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'
import { REMINDER_TEMPLATES } from '@/lib/reminder-templates'

export const metadata = pageMetadata({
  title: 'Guides — Recouvrement, mise en demeure & droit commercial',
  description:
    'Guides gratuits sur le recouvrement amiable, la mise en demeure, les pénalités de retard, la prescription des créances et la trésorerie des TPE.',
  path: '/guides',
  ogTitle: 'Guides recouvrement & droit commercial',
})

// Ordre d'affichage des catégories : du quotidien vers la procédure.
const CATEGORY_ORDER = ['Pratique', 'Droit commercial', 'Trésorerie', 'Procédure']

export default function GuidesPage() {
  const categories = CATEGORY_ORDER.filter((c) => GUIDES.some((g) => g.category === c))
  const [featured, ...others] = GUIDES

  return (
    <PublicPage>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Guides', path: '/guides' }])} />
      <div className="rf-page">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Ressources gratuites</span>
          <h1>Le recouvrement des factures, expliqué simplement.</h1>
          <p>
            {GUIDES.length} guides pour relancer sans abîmer la relation client, connaître vos droits
            et savoir quand passer à la procédure. Rédigés par {PUBLISHER.name}, fondateur d’Encair
            et alternant en cabinet d’expertise comptable : des repères généraux, qui ne remplacent
            pas un conseil juridique.
          </p>
        </header>

        <Link href={`/guides/${featured.slug}`} className="rf-card group mb-10 flex-col gap-5 p-7 sm:p-9 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rf-chip">{featured.category}</span>
              <span className="rf-meta inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {featured.readTime} de lecture
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#182b40] sm:text-3xl">{featured.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4e5b68]">{featured.metaDescription}</p>
          </div>
          <span className="rf-arrow-link shrink-0">
            Lire le guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>

        {categories.map((category) => {
          const items = others.filter((g) => g.category === category)
          if (items.length === 0) return null
          return (
            <section key={category} aria-labelledby={`cat-${category}`} className="mb-12">
              <h2 id={`cat-${category}`} className="rf-h2 mb-5">{category}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {items.map((guide) => (
                  <Link key={guide.slug} href={`/guides/${guide.slug}`} className="rf-card group flex-col gap-3 p-6">
                    <span className="rf-meta inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {guide.readTime} de lecture
                    </span>
                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-[#182b40]">{guide.title}</h3>
                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-[#4e5b68]">{guide.metaDescription}</p>
                    <span className="rf-arrow-link mt-1">
                      Lire le guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        <section aria-label="Outils gratuits" className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/modeles" className="rf-card group items-start gap-4 p-6">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#b9522d]" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-[#182b40]">{REMINDER_TEMPLATES.length} modèles de relance amiable</span>
              <span className="mt-1 block text-sm leading-relaxed text-[#4e5b68]">
                {REMINDER_TEMPLATES.map((t, i) => (i === 0 ? t.tone : t.tone.charAt(0).toLowerCase() + t.tone.slice(1))).join(', ')} : à copier et adapter au solde réel.
              </span>
            </span>
          </Link>
          <Link href="/calculateur-penalites" className="rf-card group items-start gap-4 p-6">
            <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-[#b9522d]" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-[#182b40]">Calculateur de pénalités de retard</span>
              <span className="mt-1 block text-sm leading-relaxed text-[#4e5b68]">
                Intérêts au taux BCE + 10 points, semestre par semestre, et indemnité forfaitaire de 40 €.
              </span>
            </span>
          </Link>
        </section>

        <section className="rf-panel flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <span className="rf-eyebrow">Passer à la pratique</span>
            <h2 className="text-2xl font-semibold tracking-tight">Suivez vos impayés sans tableur.</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Encair rassemble vos impayés importés par CSV, prépare vos relances email et suit
              promesses, paiements partiels et litiges. {TRIAL_LINE}
            </p>
          </div>
          <Link href="/auth/register" className="rf-button rf-button-light shrink-0">
            {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </PublicPage>
  )
}
