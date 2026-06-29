'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, X, Building2, FileText, Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    id: 1,
    icon: Sparkles,
    title: 'Bienvenue sur RelanceFlow !',
    body: "Vous venez de débloquer 30 jours pour automatiser vos relances et reprendre le contrôle de votre trésorerie. Voici les 3 étapes pour démarrer en moins de 5 minutes.",
    cta: 'C\'est parti',
  },
  {
    id: 2,
    icon: Building2,
    title: 'Configurez votre entreprise',
    body: "Renseignez votre nom commercial, SIREN et adresse pour que vos factures et relances soient conformes (mentions légales obligatoires).",
    cta: 'Configurer mon profil',
    href: '/dashboard/settings',
  },
  {
    id: 3,
    icon: FileText,
    title: 'Créez votre première facture',
    body: "Saisissez une facture (ou importez vos factures existantes via CSV). Le bouton Stripe de paiement est ajouté automatiquement à chaque relance.",
    cta: 'Créer une facture',
    href: '/dashboard/invoices/new',
  },
  {
    id: 4,
    icon: Zap,
    title: 'Activez vos relances auto',
    body: "Les relances se déclenchent automatiquement à J+7, J+15 et J+30 dès qu'une facture dépasse l'échéance. Vous pouvez personnaliser le ton et le timing.",
    cta: 'Voir le tableau de bord',
    href: '/dashboard',
  },
] as const

export function OnboardingWizard({ initialStep = 1 }: { initialStep?: number }) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [closing, setClosing] = useState(false)

  const current = STEPS.find((s) => s.id === step)!
  const Icon = current.icon
  const isLast = step === STEPS.length

  const close = async () => {
    if (closing) return
    setClosing(true)
    try {
      await fetch('/api/profile/onboarding', { method: 'POST' })
    } catch {
      // non-blocking
    }
    router.refresh()
  }

  const next = () => {
    if (isLast) {
      close()
      return
    }
    setStep(step + 1)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <button
          onClick={close}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s.id <= step ? 'bg-blue-500' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Étape {step} sur {STEPS.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 pt-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white mb-5 shadow-lg shadow-blue-200">
              <Icon className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{current.body}</p>

            {/* Quick checklist on first step */}
            {step === 1 && (
              <ul className="w-full space-y-2 mb-6 text-left">
                {[
                  'Configurer votre entreprise (1 min)',
                  'Créer ou importer vos factures',
                  'Activer les relances automatiques',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-4">
            <button
              onClick={close}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Passer
            </button>

            {'href' in current && current.href ? (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={current.href} onClick={() => close()}>
                  {current.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={next} className="bg-blue-600 hover:bg-blue-700">
                {current.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
