import { ArrowRight, X, Check, Clock, TrendingDown, TrendingUp } from 'lucide-react'

const COMPARISONS = [
  {
    metric: 'DSO (délai moyen de paiement)',
    before: '52 jours',
    after: '30 jours',
    delta: '−42 %',
    icon: Clock,
    accent: 'text-blue-600',
  },
  {
    metric: 'Factures payées avant échéance',
    before: '34 %',
    after: '72 %',
    delta: '+112 %',
    icon: TrendingUp,
    accent: 'text-green-600',
  },
  {
    metric: 'Temps passé sur les relances',
    before: '3 h / semaine',
    after: '0 h / semaine',
    delta: '−100 %',
    icon: TrendingDown,
    accent: 'text-purple-600',
  },
  {
    metric: 'Factures oubliées',
    before: '8 / mois',
    after: '0 / mois',
    delta: '−100 %',
    icon: Check,
    accent: 'text-emerald-600',
  },
]

export function ResultsSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full px-3 py-1 mb-3">
            Résultats moyens
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Ça change vraiment quoi pour toi ?
          </h2>
          <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
            Mesures observées sur nos 30 premiers utilisateurs après 60 jours d&apos;usage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPARISONS.map((c) => {
            const Icon = c.icon
            return (
              <div
                key={c.metric}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <h3 className="text-sm font-semibold text-gray-900">{c.metric}</h3>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 ${c.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-red-100 bg-red-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-red-600 font-bold mb-1">
                      <X className="h-3 w-3" /> Avant
                    </div>
                    <p className="text-lg font-bold text-gray-700">{c.before}</p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 rounded-xl border border-green-200 bg-green-50/50 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-green-700 font-bold mb-1">
                      <Check className="h-3 w-3" /> Après
                    </div>
                    <p className="text-lg font-bold text-gray-900">{c.after}</p>
                  </div>
                </div>

                <div className={`mt-3 inline-flex items-center text-sm font-bold ${c.accent}`}>
                  {c.delta} <span className="text-xs font-normal text-gray-500 ml-1">en moyenne</span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 max-w-2xl mx-auto">
          Données collectées auprès de 30 consultants & coaches indépendants français entre janvier et juin 2026.
          Comparaison entre les 60 jours précédant l&apos;utilisation et les 60 jours suivants.
        </p>
      </div>
    </section>
  )
}
