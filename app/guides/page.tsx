import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, FileText, Clock, ChevronRight, Scale, Euro, AlertTriangle, Download } from 'lucide-react'
import { GUIDES } from '@/lib/guides-content'

export const metadata: Metadata = {
  title: 'Guides — Recouvrement, mise en demeure & droit commercial',
  description:
    "10 guides gratuits sur le recouvrement amiable, la mise en demeure, les pénalités de retard, la prescription des créances et la trésorerie des TPE.",
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Guides recouvrement & droit commercial',
    description:
      "10 guides gratuits sur le recouvrement, la mise en demeure et le droit commercial pour les TPE.",
    type: 'website',
  },
}
import { SiteFooter } from '@/components/landing/footer'
import { SiteNav } from '@/components/landing/site-nav'
import { CTA_LABEL, TRIAL_LINE } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'

const AVAILABLE_SLUGS = new Set(GUIDES.map((g) => g.slug))

const categoryIcons: Record<string, typeof Scale> = {
  'Droit commercial': Scale,
  'Procédure': AlertTriangle,
  'Trésorerie': Euro,
  'Pratique': FileText,
}

// Les cartes reprennent le titre, la description et la durée de chaque guide :
// une seule source, plus d'écart entre la carte et la page.
const guides = GUIDES.map((g) => ({
  slug: g.slug,
  title: g.title,
  desc: g.metaDescription,
  readTime: g.readTime,
  category: g.category,
  icon: categoryIcons[g.category] ?? FileText,
}))

const categoryColors: Record<string, string> = {
  'Droit commercial': 'bg-blue-100 text-blue-700',
  'Procédure': 'bg-orange-100 text-orange-700',
  'Trésorerie': 'bg-green-100 text-green-700',
  'Pratique': 'bg-purple-100 text-purple-700',
}

export default function GuidesPage() {
  return (
    <div className="rf-site min-h-screen">
      {/* Header */}
      <SiteNav />

      <main id="main-content" className="mx-auto max-w-6xl px-5 py-8 space-y-7">
        {/* Hero */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 mb-5">
            <Scale className="h-4 w-4" />
            Ressources juridiques gratuites
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            Guides recouvrement & droit commercial
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Le droit du recouvrement en clair, sans jargon inutile. 10 guides rédigés par{' '}
            {PUBLISHER.name}, fondateur d’Encair et alternant en cabinet d’expertise comptable. Ils
            donnent des repères généraux et ne remplacent pas un conseil juridique.
          </p>
        </div>

        {/* Lead magnet banner */}
        <div className="rounded-2xl bg-[#182b40] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">3 modèles de relance gratuits</h3>
            <p className="text-blue-200 text-sm mt-0.5">
              Trois rappels amiables à copier et adapter au solde réel de votre facture.
            </p>
          </div>
          <Link
            href="/modeles"
            className="flex-shrink-0 rounded-xl bg-white text-blue-700 font-bold text-sm px-5 py-2.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Voir les modèles
          </Link>
        </div>

        {/* Guides grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {guides.map((guide, i) => {
            const Icon = guide.icon
            const available = AVAILABLE_SLUGS.has(guide.slug)
            const cardClass = `rounded-xl border bg-white p-5 flex flex-col gap-3 transition-all group ${
              available ? 'hover:border-blue-300 hover:shadow-md cursor-pointer' : 'cursor-default opacity-75'
            }`
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${categoryColors[guide.category]?.replace('text-', 'text-').split(' ')[0] || 'bg-gray-100'}`}>
                    <Icon className={`h-4.5 w-4.5 ${categoryColors[guide.category]?.split(' ')[1] || 'text-gray-600'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryColors[guide.category] || 'bg-gray-100 text-gray-600'}`}>
                      {guide.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {guide.readTime}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug group-hover:text-blue-700 transition-colors">
                    {guide.title}
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{guide.desc}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <span className="text-xs text-gray-500">Guide #{i + 1}</span>
                  {available ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
                      Lire le guide
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 italic">Bientôt disponible</span>
                  )}
                </div>
              </>
            )
            return available ? (
              <Link key={guide.slug} href={`/guides/${guide.slug}`} className={cardClass}>
                {content}
              </Link>
            ) : (
              <div key={guide.slug} className={cardClass}>
                {content}
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-500">
          Besoin d’un chiffre précis ?{' '}
          <Link href="/calculateur-penalites" className="font-semibold text-blue-700 underline">
            Calculez les pénalités de retard d’une facture
          </Link>
        </p>

        {/* CTA */}
        <div className="rounded-2xl border bg-white p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Suivez vos impayés sans tableur
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Encair rassemble vos impayés importés par CSV, prépare vos relances email et suit
            promesses, paiements partiels et litiges.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#182b40] text-white font-bold px-6 py-3 transition-all hover:bg-[#294059]"
          >
            {CTA_LABEL}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-gray-500 mt-3">{TRIAL_LINE}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
