'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calculator, ChevronRight, Info, Zap } from 'lucide-react'
import { SiteFooter } from '@/components/landing/footer'
import { Logo } from '@/components/brand/logo'

// Reference rates for late-payment interest under French commercial law.
// Source: Banque de France — see https://www.banque-france.fr
// For B2B: penalty rate = ECB refinance rate + 10 percentage points
//           OR a contractual rate if specified in CGV/T&Cs
// Indemnity: flat 40 € per invoice (art. D441-5 C.com.)
const ECB_RATE = 4.5 // ECB main refinancing rate (%) — sample, update via env if needed
const PENALTY_RATE_DEFAULT = ECB_RATE + 10
const FLAT_FEE = 40

function formatEuro(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function CalculateurPenalitesPage() {
  const [amount, setAmount] = useState('1000')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [rate, setRate] = useState(PENALTY_RATE_DEFAULT.toString())

  const result = useMemo(() => {
    const principal = parseFloat(amount.replace(',', '.')) || 0
    const annualRate = (parseFloat(rate.replace(',', '.')) || 0) / 100
    const due = new Date(dueDate)
    const today = new Date()
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    )

    const dailyInterest = (principal * annualRate) / 365
    const interest = dailyInterest * daysOverdue

    return {
      principal,
      daysOverdue,
      interest: Math.round(interest * 100) / 100,
      flatFee: FLAT_FEE,
      total: Math.round((principal + interest + FLAT_FEE) * 100) / 100,
    }
  }, [amount, dueDate, rate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/auth/register"
            className="rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2 transition-all hover:shadow-md hover:scale-[1.02]"
          >
            Essai gratuit 30 j
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white mb-4 shadow-lg shadow-brand-500/30">
            <Calculator className="h-7 w-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Calculateur de pénalités de retard
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Calculez en temps réel le montant des pénalités légales et de l&apos;indemnité forfaitaire
            de 40 € dues sur une facture B2B impayée (art. L441-10 du Code de commerce).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Form */}
          <div className="md:col-span-3 rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Votre facture impayée</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Montant TTC de la facture (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Date d&apos;échéance initiale
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                  Taux annuel de pénalité (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Par défaut : taux BCE ({ECB_RATE} %) + 10 points = {PENALTY_RATE_DEFAULT} %.
                  Si vos CGV mentionnent un taux différent, indiquez-le ici.
                </p>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className="md:col-span-2 rounded-2xl bg-brand-gradient text-white p-6 shadow-xl shadow-brand-500/30 relative overflow-hidden">
            <div className="brand-orb bg-fuchsia-400/30 h-[200px] w-[200px] -bottom-10 -right-10" />
            <p className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-4">
              Total dû par le débiteur
            </p>
            <p className="text-4xl font-extrabold mb-1">{formatEuro(result.total)}</p>
            <p className="text-xs text-blue-200 mb-6">
              {result.daysOverdue} jour{result.daysOverdue > 1 ? 's' : ''} de retard
            </p>

            <div className="space-y-2.5 border-t border-white/20 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-100">Principal</span>
                <span className="font-semibold">{formatEuro(result.principal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-100">Intérêts de retard</span>
                <span className="font-semibold">{formatEuro(result.interest)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-100">Indemnité forfaitaire</span>
                <span className="font-semibold">{formatEuro(result.flatFee)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal note */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mt-8">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Ce que dit la loi</p>
              <p className="text-amber-800 leading-relaxed">
                Toute facture B2B impayée à l&apos;échéance ouvre droit, de plein droit et sans
                rappel, à des pénalités de retard (art. L441-10 C.com.) et à une indemnité
                forfaitaire de recouvrement de <strong>40 €</strong> (art. D441-5 C.com.).
                Ces sommes sont dues que vous les ayez explicitement réclamées ou non.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-white border border-gray-200 p-8 mt-8 text-center shadow-sm">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-3">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Réclamez ces pénalités automatiquement
          </h3>
          <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
            RelanceFlow génère vos mises en demeure avec calcul automatique des pénalités
            et envoi par email + lien de paiement Stripe.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-bold px-6 py-3 transition-all hover:shadow-lg hover:shadow-brand-500/30"
          >
            Démarrer 30 jours gratuits
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
