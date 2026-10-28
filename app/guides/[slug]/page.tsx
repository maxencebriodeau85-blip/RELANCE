import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import { GUIDES } from '@/lib/guides-content'
import { PublicPage } from '@/components/landing/public-page'
import { JsonLd } from '@/components/seo/json-ld'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { CTA_LABEL, TRIAL_LINE } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) return { title: 'Guide introuvable' }
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `/guides/${guide.slug}` },
    authors: [{ name: PUBLISHER.name }],
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      type: 'article',
      url: `/guides/${guide.slug}`,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: [PUBLISHER.name],
      section: guide.category,
    },
  }
}

const frenchDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) notFound()

  // Deux guides à lire ensuite : même catégorie d'abord.
  const related = GUIDES.filter((g) => g.slug !== guide.slug)
    .sort((a, b) => Number(a.category !== guide.category) - Number(b.category !== guide.category))
    .slice(0, 2)

  return (
    <PublicPage>
      <JsonLd data={articleJsonLd(guide, PUBLISHER.name)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Guides', path: '/guides' }, { name: guide.metaTitle, path: `/guides/${guide.slug}` }])} />
      <article className="rf-page rf-page-narrow">
        <nav aria-label="Fil d’Ariane" className="mb-8">
          <Link href="/guides" className="rf-arrow-link text-[#4e5b68]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Tous les guides
          </Link>
        </nav>

        <header className="rf-page-head mb-10">
          <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="rf-chip">{guide.category}</span>
            <span className="rf-meta inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {guide.readTime} de lecture
            </span>
            <span className="rf-meta inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Mis à jour le <time dateTime={guide.updatedAt}>{frenchDate(guide.updatedAt)}</time>
            </span>
          </div>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
          <p className="rf-meta">
            Par {PUBLISHER.name}, fondateur d’Encair, alternant en cabinet d’expertise comptable.
          </p>
        </header>

        <aside className="rf-callout mb-10" aria-label="Avertissement">
          Ce guide donne des repères généraux ; il ne remplace pas l’examen de votre contrat et de votre
          situation. Encair assure le suivi amiable : il ne fournit ni acte juridique validé ni
          représentation en justice. Pour une procédure, vérifiez les règles et formulaires sur{' '}
          <a href="https://entreprendre.service-public.gouv.fr/" rel="noopener noreferrer" target="_blank">
            Service Public
          </a>
          .
        </aside>

        <div className="rf-prose">
          {guide.sections.map((section, i) => (
            <section key={i}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
              {section.list && (
                <ul>
                  {section.list.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {guide.slug === 'penalites-retard-calcul' && (
            <p>
              <Link href="/calculateur-penalites">Calculer les pénalités d’une facture avec le calculateur gratuit</Link>
            </p>
          )}
        </div>

        <section className="rf-card mt-12 p-6 sm:p-7" aria-labelledby="resume">
          <h2 id="resume" className="text-lg font-semibold text-[#182b40]">En résumé</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#2f3f50]">{guide.conclusion}</p>
        </section>

        {related.length > 0 && (
          <section className="mt-14 border-t border-[#e3ddd2] pt-10" aria-labelledby="a-lire">
            <h2 id="a-lire" className="rf-eyebrow">À lire aussi</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/guides/${r.slug}`} className="rf-card group flex-col gap-3 p-5">
                  <span className="rf-meta">
                    {r.category} · {r.readTime}
                  </span>
                  <span className="font-semibold leading-snug text-[#182b40]">{r.title}</span>
                  <span className="rf-arrow-link mt-auto">
                    Lire le guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rf-panel mt-14" aria-labelledby="essai">
          <span className="rf-eyebrow">Passer à la pratique</span>
          <h2 id="essai" className="text-2xl font-semibold tracking-tight">Suivez vos impayés sans tableur.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed">
            Encair rassemble vos impayés importés par CSV, prépare vos relances email et suit promesses,
            paiements partiels et litiges.
          </p>
          <Link href="/auth/register" className="rf-button rf-button-light mt-6">
            {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <p className="mt-4 text-xs">{TRIAL_LINE}</p>
        </section>
      </article>
    </PublicPage>
  )
}
