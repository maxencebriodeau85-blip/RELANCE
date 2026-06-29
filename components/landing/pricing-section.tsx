'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Zap, Star, Rocket } from 'lucide-react'

interface Plan {
  id: string
  name: string
  icon: typeof Zap
  tagline: string
  monthly: number
  annual: number
  features: string[]
  color: string
  accent: string
  button: string
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    tagline: 'Consultants & coaches indépendants',
    monthly: 19,
    annual: 190,
    features: [
      "Jusqu'à 30 factures/mois",
      'Pipeline kanban 5 étapes (contacts illimités)',
      "Journal d'activité (appels, emails, notes)",
      'Relances factures automatiques (J+7/15/30)',
      'Paiement en ligne Stripe intégré',
      'Dashboard commercial & encaissements',
      'Support par email',
    ],
    color: 'border-blue-500 shadow-blue-100',
    accent: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Star,
    tagline: 'Agences & freelances en croissance',
    monthly: 49,
    annual: 490,
    recommended: true,
    features: [
      "Jusqu'à 200 factures/mois",
      'Tout Starter +',
      'Scénarios de relance personnalisables',
      'Mise en demeure PDF (art. 1344 C.civ.)',
      'Export CSV & statistiques avancées',
      'Import CSV en masse',
      'Support prioritaire',
    ],
    color: 'border-purple-500 shadow-purple-100',
    accent: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
  },
  {
    id: 'business',
    name: 'Business',
    icon: Rocket,
    tagline: 'Cabinets & équipes',
    monthly: 99,
    annual: 990,
    features: [
      "Jusqu'à 1000 factures/mois",
      'Tout Pro +',
      'API & webhooks',
      'Multi-utilisateurs',
      'Intégration Pennylane',
      'Account manager dédié',
      'SLA 99,9 %',
    ],
    color: 'border-amber-500 shadow-amber-100',
    accent: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Un plan pour chaque étape
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            30 jours d&apos;essai gratuit. Sans carte bancaire. Annulation à tout moment.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-white rounded-full border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !annual ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                annual ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annuel
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                annual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
              }`}>
                -2 mois
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {PLANS.map((p) => {
            const Icon = p.icon
            const price = annual ? Math.round(p.annual / 12) : p.monthly
            const fullPrice = annual ? p.annual : p.monthly * 12
            const savingsPerYear = annual ? p.monthly * 12 - p.annual : 0
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border-2 bg-white p-7 transition-all ${p.color} shadow-xl ${
                  p.recommended ? 'md:scale-110 md:-translate-y-3 md:shadow-2xl md:z-10' : 'md:opacity-90'
                }`}
              >
                {p.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-gradient text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30 whitespace-nowrap">
                    ⭐ Le plus choisi
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 ${p.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500">{p.tagline}</p>
                  </div>
                </div>

                <div className="mb-1 mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold text-gray-900">{price}</span>
                    <span className="text-xl font-bold text-gray-400">€</span>
                    <span className="text-gray-400 text-sm ml-1">/mois</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {annual
                      ? `${fullPrice} € facturés à l'année`
                      : `${fullPrice} € sur 12 mois`}
                  </p>
                  {annual && savingsPerYear > 0 && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                      Économie : {savingsPerYear} € /an
                    </p>
                  )}
                </div>

                <Link
                  href="/auth/register"
                  className={`block text-center rounded-xl text-white font-bold py-3 text-sm transition-colors shadow-lg mt-6 ${p.button}`}
                >
                  Démarrer 30 j gratuits
                </Link>

                {/* Reassurance immediately under the CTA — kills the
                    "what if I commit and regret" objection at the moment
                    it surfaces, not 3 screens away. */}
                <p className="text-[11px] text-center text-gray-500 mt-2.5 leading-relaxed">
                  Sans carte bancaire · Annulation en 1 clic
                </p>

                <ul className="space-y-2.5 mt-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${p.accent}`} />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-500 mt-10">
          Besoin d&apos;un volume plus important ou de fonctionnalités sur-mesure ?{' '}
          <a href="mailto:hello@relanceflow.fr" className="text-blue-600 hover:underline font-semibold">
            Contactez-nous
          </a>
        </p>
      </div>
    </section>
  )
}
