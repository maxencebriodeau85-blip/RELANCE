'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ListChecks } from 'lucide-react'
import { PublicPage } from '@/components/landing/public-page'
import { formatEuro } from '@/lib/metrics'
import { CTA_LABEL } from '@/lib/plans'
import {
  FLAT_RECOVERY_FEE,
  computeLatePenalties,
  formatRate,
  latePenaltyRate,
} from '@/lib/rates'

// Taux légal par défaut : taux BCE du semestre + 10 points (art. L441-10 II C. com.),
// appliqué semestre par semestre. Taux contractuel possible s'il figure dans les CGV.
const CURRENT_RATE = latePenaltyRate()

export default function CalculateurPenalitesPage() {
  const [amount, setAmount] = useState('1000')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [useContractRate, setUseContractRate] = useState(false)
  const [rate, setRate] = useState(CURRENT_RATE.rate.toString())

  const result = useMemo(() => {
    const principal = parseFloat(amount.replace(',', '.')) || 0
    const contractRate = parseFloat(rate.replace(',', '.'))
    const todayIso = new Date().toISOString().slice(0, 10)
    const computed = computeLatePenalties(
      principal,
      dueDate,
      todayIso,
      useContractRate && Number.isFinite(contractRate) ? contractRate : undefined,
    )
    // L'indemnité de 40 € n'est due qu'à partir du premier jour de retard.
    const flatFee = computed.days > 0 ? FLAT_RECOVERY_FEE : 0
    return {
      principal,
      daysOverdue: computed.days,
      interest: computed.interest,
      periods: computed.periods,
      allRatesKnown: computed.allRatesKnown,
      flatFee,
      total: Math.round((principal + computed.interest + flatFee) * 100) / 100,
    }
  }, [amount, dueDate, rate, useContractRate])

  return (
    <PublicPage>
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head">
          <span className="rf-eyebrow">Outil gratuit</span>
          <h1>Calculateur de pénalités de retard</h1>
          <p>
            Pénalités de retard et indemnité forfaitaire de 40 € dues par un client professionnel sur
            une facture impayée (art. L441-10 du Code de commerce), calculées semestre par semestre.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <section className="rf-card block p-6 md:col-span-3" aria-labelledby="facture">
            <h2 id="facture" className="mb-5 font-semibold text-[#182b40]">Votre facture impayée</h2>
            <div className="space-y-5">
              <div className="rf-field">
                <label htmlFor="montant">Montant TTC de la facture (€)</label>
                <input
                  id="montant"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="rf-field">
                <label htmlFor="echeance">Date d’échéance initiale</label>
                <input id="echeance" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="rf-field">
                <label htmlFor="taux-cgv" className="!flex items-center gap-2">
                  <input
                    id="taux-cgv"
                    type="checkbox"
                    checked={useContractRate}
                    onChange={(e) => setUseContractRate(e.target.checked)}
                    className="h-4 w-4 accent-[#182b40]"
                  />
                  Mes CGV prévoient un autre taux
                </label>
                {useContractRate ? (
                  <>
                    <label htmlFor="taux" className="sr-only">Taux annuel prévu par vos CGV (%)</label>
                    <input
                      id="taux"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                    />
                  </>
                ) : null}
                <p className="rf-meta mt-2">
                  Par défaut : taux BCE du semestre + 10 points, soit {formatRate(CURRENT_RATE.rate)} au{' '}
                  {CURRENT_RATE.label}, appliqué semestre par semestre. Un taux contractuel ne peut pas
                  être inférieur à 3 fois le taux d’intérêt légal.
                </p>
              </div>
            </div>
          </section>

          <section className="rf-panel md:col-span-2" aria-labelledby="total" aria-live="polite">
            <h2 id="total" className="rf-eyebrow">Total dû par le débiteur</h2>
            <p className="text-4xl font-semibold tracking-tight text-white">{formatEuro(result.total)}</p>
            <p className="mt-1 text-xs">
              {result.daysOverdue} jour{result.daysOverdue > 1 ? 's' : ''} de retard
            </p>
            {!useContractRate && result.periods.length > 0 && (
              <p className="mt-4 text-xs leading-relaxed">
                Taux appliqués : {result.periods.join(' · ')}
                {!result.allRatesKnown && ' (estimation : taux d’un semestre non encore renseigné)'}
              </p>
            )}
            <dl className="mt-5 space-y-2.5 border-t border-white/15 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#c3cfdc]">Principal</dt>
                <dd className="font-semibold text-white">{formatEuro(result.principal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#c3cfdc]">Intérêts de retard</dt>
                <dd className="font-semibold text-white">{formatEuro(result.interest)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#c3cfdc]">Indemnité forfaitaire</dt>
                <dd className="font-semibold text-white">{formatEuro(result.flatFee)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="rf-callout mt-8" aria-labelledby="loi">
          <h2 id="loi" className="mb-1 font-semibold text-[#3a2a20]">Ce que dit la loi</h2>
          <p>
            Entre professionnels, une facture impayée à l’échéance ouvre droit, de plein droit et sans
            rappel, à des pénalités de retard (art. L441-10 C. com.) et à une indemnité forfaitaire de
            recouvrement de <strong>40 €</strong> par facture (art. D441-5 C. com.). L’indemnité n’est
            pas due lorsqu’une procédure collective interdit le paiement de la créance à son échéance.
          </p>
          <p className="mt-2">
            <strong>Client particulier :</strong> ni ces pénalités ni l’indemnité ne s’appliquent. Seuls
            des intérêts au taux légal courent, à compter d’une mise en demeure (art. 1344-1 C. civ.).
            Ce calcul est indicatif et ne remplace pas un conseil juridique. Pour aller plus loin :{' '}
            <Link href="/guides/penalites-retard-calcul">le guide des pénalités de retard</Link>.
          </p>
        </aside>

        <section className="rf-card mt-8 flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="suivre">
          <div className="flex items-start gap-4">
            <ListChecks className="mt-1 h-5 w-5 shrink-0 text-[#b9522d]" aria-hidden="true" />
            <div>
              <h2 id="suivre" className="font-semibold text-[#182b40]">Suivez cette facture dans Encair</h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-[#4e5b68]">
                Relances email, promesses de paiement et paiements partiels : chaque impayé reste visible
                jusqu’à son règlement.
              </p>
            </div>
          </div>
          <Link href="/auth/register" className="rf-button rf-button-dark shrink-0">
            {CTA_LABEL} <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </PublicPage>
  )
}
