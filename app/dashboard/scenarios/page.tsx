import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import {
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import type { ReminderScenario, ScenarioStep } from '@/lib/database.types'

const DEFAULT_SCENARIOS: ReminderScenario[] = [
  {
    id: 'cordial',
    user_id: null,
    name: 'Cordial',
    description: 'Relance amicale pour les clients habituellement sérieux. Ton poli, suppose un oubli.',
    steps: [
      {
        day: 7,
        type: 'email_1',
        subject: 'Rappel : Facture {invoice_number} arrive à échéance',
        tone: 'cordial',
        channel: 'email',
      },
    ],
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ferme',
    user_id: null,
    name: 'Ferme',
    description:
      'Deux relances successives avec un ton de plus en plus ferme. Idéal pour les retards récurrents.',
    steps: [
      {
        day: 15,
        type: 'email_1',
        subject: 'Relance : Facture {invoice_number} en retard de paiement',
        tone: 'ferme',
        channel: 'email',
      },
      {
        day: 30,
        type: 'email_2',
        subject: '2ème relance : Facture {invoice_number} - Action requise',
        tone: 'ferme',
        channel: 'email',
      },
    ],
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'precontentieux',
    user_id: null,
    name: 'Pré-contentieux',
    description: 'Escalade progressive avec mise en demeure finale. Pour les impayés persistants.',
    steps: [
      {
        day: 45,
        type: 'email_1',
        subject: 'Relance urgente : Facture {invoice_number} en souffrance',
        tone: 'precontentieux',
        channel: 'email',
      },
      {
        day: 60,
        type: 'email_2',
        subject: 'Dernière relance avant mise en demeure - Facture {invoice_number}',
        tone: 'precontentieux',
        channel: 'email',
      },
      {
        day: 75,
        type: 'formal_notice',
        subject: 'MISE EN DEMEURE - Facture {invoice_number}',
        tone: 'formal_notice',
        channel: 'courrier',
      },
    ],
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const toneConfig = {
  cordial: { label: 'Cordial', color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  ferme: { label: 'Ferme', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  precontentieux: { label: 'Pré-contentieux', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  formal_notice: { label: 'Mise en demeure', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

const channelConfig = {
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: MessageSquare },
  courrier: { label: 'Courrier LRAR', icon: Mail },
}

const stepTypeLabel = {
  email_1: '1ère relance',
  email_2: '2ème relance',
  email_3: '3ème relance',
  formal_notice: 'Mise en demeure',
}

const scenarioColorClass = {
  Cordial: 'border-blue-200 bg-blue-50',
  Ferme: 'border-yellow-200 bg-yellow-50',
  'Pré-contentieux': 'border-orange-200 bg-orange-50',
}

export default async function ScenariosPage() {
  let scenarios: ReminderScenario[] = DEFAULT_SCENARIOS

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('reminder_scenarios')
      .select('*')
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      scenarios = data as ReminderScenario[]
    }
  } catch {
    // use defaults
  }

  return (
    <div>
      <Header
        title="Scénarios de relance"
        description="Choisissez et configurez vos stratégies de recouvrement automatisées"
      />

      <div className="p-6 space-y-6">
        <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Scénarios préconfigurés</p>
              <p className="text-sm text-blue-600 mt-1">
                Trois scénarios adaptés à différentes situations sont disponibles par défaut.
                Chaque scénario définit une séquence d&apos;actions automatiques déclenchées selon les
                jours de retard.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{scenario.name}</CardTitle>
                    {scenario.is_default && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Scénario par défaut
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(scenario.steps as ScenarioStep[]).length} étape
                    {(scenario.steps as ScenarioStep[]).length > 1 ? 's' : ''}
                  </Badge>
                </div>
                <CardDescription className="text-sm mt-2">{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Timeline of steps */}
                <div className="relative">
                  {(scenario.steps as ScenarioStep[]).map((step, index) => {
                    const ToneIcon = toneConfig[step.tone]?.icon || Mail
                    const ChannelIcon = channelConfig[step.channel]?.icon || Mail
                    const isLast = index === (scenario.steps as ScenarioStep[]).length - 1

                    return (
                      <div key={index} className="relative flex gap-3 pb-4">
                        {/* Vertical line */}
                        {!isLast && (
                          <div className="absolute left-3.5 top-7 bottom-0 w-px bg-gray-200" />
                        )}

                        {/* Step indicator */}
                        <div
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            step.type === 'formal_notice'
                              ? 'bg-red-100 text-red-700'
                              : index === 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {step.day}j
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {stepTypeLabel[step.type]}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                toneConfig[step.tone]?.color || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {toneConfig[step.tone]?.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <ChannelIcon className="h-3 w-3" />
                            <span>{channelConfig[step.channel]?.label}</span>
                            <span className="mx-1">·</span>
                            <Clock className="h-3 w-3" />
                            <span>J+{step.day} après échéance</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 truncate" title={step.subject}>
                            {step.subject}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info section */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Comment fonctionnent les scénarios ?</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Déclenchement automatique</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Les relances partent automatiquement selon les jours de retard configurés dans
                    chaque étape.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 flex-shrink-0">
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Emails personnalisés</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Chaque email est automatiquement personnalisé avec les informations du client et
                    de la facture.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Escalade progressive</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Le ton et l&apos;urgence augmentent à chaque étape pour maximiser les chances de
                    recouvrement.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
