import { ArrowRight, Check, X } from 'lucide-react'

// "Avant / Après" of the workflow itself — no fabricated %, no claim like
// "−42% DSO observed on 30 users" (audit June 2026: not measurable yet,
// undermines credibility on a financial product). We describe what
// concretely changes in your week-to-week.

const COMPARISONS = [
  {
    metric: 'Quand tu envoies une relance',
    before: 'Tu écris l\'email à la main, tu retrouves le n° de facture, tu copies-colles',
    after: 'Tu cliques « Relancer ». L\'email part avec un bouton de paiement Stripe.',
  },
  {
    metric: "Quand le délai d'échéance arrive",
    before: 'Tu y penses (ou pas). Tu ouvres ton tableur, tu vérifies qui doit quoi.',
    after: 'RelanceFlow déclenche la séquence J+7/15/30 sans que tu touches au clavier.',
  },
  {
    metric: "Quand un client paie en retard",
    before: 'Tu calcules les pénalités à la main et tu n\'oses pas les facturer.',
    after: 'Mise en demeure conforme art. 1344 C.civ. générée + pénalités calculées.',
  },
  {
    metric: 'Quand tu veux savoir où tu en es',
    before: 'Tu fais un point Excel le week-end. Tu oublies 2 factures.',
    after: 'Dashboard temps réel : créances, retard, DSO, top clients en un écran.',
  },
]

export function ResultsSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-brand-50/40 via-white to-purple-50/40">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-100 rounded-full px-3 py-1 mb-3">
            Ce qui change concrètement
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Le geste devient automatique.
          </h2>
          <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto text-pretty">
            Pas de magie ni de chiffres marketing — juste 4 moments de ta semaine qui passent
            de « je dois penser à faire ça » à « c&apos;est déjà fait ».
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMPARISONS.map((c) => (
            <div
              key={c.metric}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{c.metric}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-50 mt-0.5">
                    <X className="h-3 w-3 text-red-500" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-red-600 font-bold">Avant</span>
                    <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{c.before}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 pt-3 border-t border-gray-100">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 mt-0.5">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Après</span>
                    <p className="text-sm text-gray-900 mt-0.5 leading-relaxed font-medium">{c.after}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 text-sm text-gray-500">
          Tu veux mesurer combien de temps tu gagnes vraiment ?{' '}
          <a href="#pricing" className="text-brand-700 hover:underline font-semibold inline-flex items-center gap-1">
            Teste 30 j gratuits <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  )
}
