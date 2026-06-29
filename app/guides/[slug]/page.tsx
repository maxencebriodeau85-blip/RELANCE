import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ChevronRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import { GUIDES } from '@/lib/guides-content'
import { SiteFooter } from '@/components/landing/footer'

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = GUIDES.find((g) => g.slug === params.slug)
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
    },
  }
}

export default function GuideArticlePage({ params }: { params: { slug: string } }) {
  const guide = GUIDES.find((g) => g.slug === params.slug)
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
    author: { '@type': 'Organization', name: 'RelanceFlow' },
    publisher: {
      '@type': 'Organization',
      name: 'RelanceFlow',
      logo: { '@type': 'ImageObject', url: '/icon.png' },
    },
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/guides"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Tous les guides
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Essai gratuit 30 j
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {/* Article header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <span className="rounded-full bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5">
              {guide.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {guide.readTime}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(guide.publishedAt).toLocaleDateString('fr-FR', {
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
        <div className="rounded-2xl bg-brand-gradient text-white p-8 mt-12 text-center shadow-xl shadow-brand-500/30 relative overflow-hidden">
          <div className="brand-orb bg-fuchsia-400/30 h-[200px] w-[200px] -bottom-10 -right-10" />
          <div className="relative">
            <h3 className="text-xl font-bold mb-2">Automatisez tout ce que vous venez de lire</h3>
            <p className="text-white/80 text-sm mb-5">
              RelanceFlow gère relances, mise en demeure et paiement en ligne — sans intervention manuelle.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 font-bold px-6 py-3 hover:bg-brand-50 transition-colors"
            >
              Démarrer 30 jours gratuits
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter />
    </div>
  )
}
