'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function CashCalculator() {
  const [ca, setCA] = useState('')
  const [dso, setDSO] = useState('')

  const caNum = parseFloat(ca.replace(/\s/g, '').replace(',', '.')) || 0
  const dsoNum = parseFloat(dso) || 0
  const TARGET_DSO = 28 // average RelanceFlow client result

  const encours = (caNum / 365) * dsoNum
  const gainPossible = caNum > 0 && dsoNum > TARGET_DSO
    ? (caNum / 365) * (dsoNum - TARGET_DSO)
    : 0

  const hasResult = caNum > 0 && dsoNum > 0

  return (
    <div className="rounded-2xl border border-blue-100 bg-white shadow-xl shadow-blue-100/50 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
        <h3 className="text-white font-bold text-lg leading-tight">
          Combien d&apos;argent dort dehors en ce moment ?
        </h3>
        <p className="text-blue-200 text-sm mt-1">
          Calculez votre gain de trésorerie potentiel en 10 secondes
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Votre CA annuel HT
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={ca}
                onChange={(e) => setCA(e.target.value.replace(/[^\d,. ]/g, ''))}
                placeholder="500 000"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Votre DSO actuel
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="365"
                value={dso}
                onChange={(e) => setDSO(e.target.value)}
                placeholder="45"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">j</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Le DSO (Days Sales Outstanding) est votre délai moyen de paiement client. Moyenne française : 52 jours.
        </p>

        {hasResult ? (
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  Encours clients actuels
                </p>
                <p className="text-2xl font-bold text-gray-900">{fmt(encours)}</p>
                <p className="text-xs text-gray-500 mt-0.5">immobilisés dans vos créances</p>
              </div>
              {gainPossible > 0 && (
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
                    Récupérables avec RelanceFlow
                  </p>
                  <p className="text-2xl font-bold text-green-600">+{fmt(gainPossible)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">de trésorerie libérée / an</p>
                </div>
              )}
            </div>

            {gainPossible > 0 && (
              <div className="pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    En ramenant votre DSO de{' '}
                    <strong>{dsoNum}j</strong> à{' '}
                    <strong>{TARGET_DSO}j</strong>{' '}
                    (objectif moyen RelanceFlow), vous récupérez{' '}
                    <strong className="text-green-700">{fmt(gainPossible)}</strong> de trésorerie annuelle.
                  </p>
                </div>
                <Link
                  href="/auth/register"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 transition-colors"
                >
                  Récupérer mes {fmt(gainPossible)} — Essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {dsoNum <= TARGET_DSO && dsoNum > 0 && (
              <p className="text-sm text-green-700 font-medium">
                ✓ Votre DSO est déjà excellent ! RelanceFlow vous aidera à le maintenir automatiquement.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 text-center">
            <p className="text-sm text-gray-400">
              Entrez votre CA et votre DSO pour voir votre potentiel de trésorerie
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
