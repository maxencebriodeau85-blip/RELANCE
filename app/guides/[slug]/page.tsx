import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ChevronRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import { GUIDES } from '@/lib/guides-content'
import { SiteFooter } from '@/components/landing/footer'
import { SiteNav } from '@/components/landing/site-nav'
import { CTA_LABEL } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const {slug}=await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) return { title: 'Guide introuvable' }
  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
  }
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const {slug}=await params
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) notFound()

  // Related guides — other entries in the same category (or any other guide
  // if the category has no siblings). Limit to 2.
  const related = GUIDES
    .filter((g) => g.slug !== guide.slug)
    .sort((a, b) => {
      const aMatch = a.category === guide.category ? 0 : 1
      const bMatch = b.category === guide.category ? 0 : 1
      return aMatch - bMatch
    })
    .slice(0, 2)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: { '@type': 'Person', name: PUBLISHER.name },
    publisher: {
      '@type': 'Organization',
      name: 'Encair',
      logo: { '@type': 'ImageObject', url: '/icon.svg' },
    },
  }

  return (
    <div className="rf-site min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <SiteNav />
      <main id="main-content">
      <div className="mx-auto max-w-3xl px-5 pt-6">
        <Link href="/guides" className="inline-flex items-center gap-2 text-sm text-[#526171] hover:text-[#182b40]">
          <ArrowLeft className="h-4 w-4" /> Tous les guides
        </Link>
      </div>

      <article className="mx-auto max-w-3xl px-5 py-6">
        <aside className="mb-6 rounded border border-blue-100 bg-blue-50 p-4 text-sm">Ce guide donne des repères généraux ; il ne remplace pas l’examen de votre contrat et de votre situation. Encair assure le suivi amiable : il ne fournit ni acte juridique validé ni représentation en justice. Pour une procédure, vérifiez les règles et formulaires sur <a className="underline" href="https://entreprendre.service-public.gouv.fr/">Service Public</a>.</aside>
        {/* Article header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <span className="rounded-full bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5">
              {guide.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {guide.readTime}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Mis à jour le{' '}
              {new Date(guide.updatedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {guide.title}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">{guide.intro}</p>
          <p className="mt-4 text-xs text-gray-500">
            Par {PUBLISHER.name}, fondateur d’Encair, alternant en cabinet d’expertise comptable.
            Ce guide donne des repères généraux et ne remplace pas un conseil juridique adapté à
            votre situation.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-8 text-gray-800 leading-relaxed">
          {guide.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{section.heading}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mb-3 text-[15px]">{p}</p>
              ))}
              {section.list && (
                <ul className="list-disc pl-5 space-y-1.5 mt-2 text-[15px]">
                  {section.list.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {guide.slug === 'penalites-retard-calcul' && (
            <p className="text-[15px]">
              <Link href="/calculateur-penalites" className="font-semibold text-blue-700 underline">
                Calculer les pénalités d’une facture avec notre calculateur gratuit →
              </Link>
            </p>
          )}

          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 mt-10">
            <h2 className="text-lg font-bold text-gray-900 mb-2">En résumé</h2>
            <p className="text-[15px] text-gray-700">{guide.conclusion}</p>
          </div>
        </div>

        {/* Related guides */}
        {related.length > 0 && (
          <section className="mt-12 pt-10 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                À lire aussi
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/guides/${r.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white hover:border-brand-300 hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>{r.category}</span>
                    <span>·</span>
                    <span>{r.readTime}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-snug group-hover:text-brand-700 transition-colors">
                    {r.title}
                  </h4>
                  <span className="text-xs font-semibold text-brand-600 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    Lire le guide
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="rounded-xl bg-[#182b40] text-white p-6 mt-8 text-center">
          <div className="relative">
            <h3 className="text-xl font-bold mb-2">Suivez vos impayés sans tableur</h3>
            <p className="text-white/80 text-sm mb-5">
              Encair rassemble vos impayés importés par CSV, prépare vos relances email et suit
              promesses, paiements partiels et litiges.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 font-bold px-6 py-3 hover:bg-brand-50 transition-colors"
            >
              {CTA_LABEL}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
      </main>

      <SiteFooter />
    </div>
  )
}
