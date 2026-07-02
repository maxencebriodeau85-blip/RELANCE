import { Sparkles, MessageSquare, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Early-access mode: no fabricated metrics, no nominative quotes with euro
// amounts (audit June 2026 — these contradict the "avant-première" positioning
// and signal manufactured proof). When we have 3 real customers willing to be
// quoted with their full name + company, this section gets replaced.

const EARLY_PROMISES = [
  {
    icon: Clock,
    title: 'Beta access dès aujourd\'hui',
    body: "30 jours gratuits, sans carte bancaire. Tu testes en condition réelle sur tes propres factures.",
  },
  {
    icon: MessageSquare,
    title: 'Le fondateur te répond',
    body: "Une question, un bug, une feature qui te manque ? Tu écris à hello@relanceflow.fr et tu as une vraie réponse, pas un bot.",
  },
  {
    icon: Sparkles,
    title: 'Tarif fondateur garanti',
    body: "Le prix que tu vois aujourd'hui restera le tien tant que tu seras abonné, même si on augmente nos tarifs ensuite.",
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center mb-12">
          <span className="section-eyebrow mb-4">Early access</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight text-balance">
            On préfère être honnête.
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto text-pretty">
            RelanceFlow est jeune. On construit l&apos;outil avec nos premiers utilisateurs
            indépendants français. Si tu cherches un produit ultra-poli avec 10 000 logos clients
            en bas de page, ce n&apos;est pas encore nous. Si tu cherches un outil qui marche, conçu
            par quelqu&apos;un qui te répond — bienvenue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {EARLY_PROMISES.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="card-premium p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/10 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:gap-2.5 transition-all"
          >
            Bloquer ton tarif fondateur
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
