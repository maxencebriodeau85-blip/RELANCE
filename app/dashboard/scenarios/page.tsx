'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Bell,
  BellOff,
  Zap,
  Info,
} from 'lucide-react'

interface ScenarioStep {
  day: number
  type: 'email_1' | 'email_2' | 'email_3' | 'formal_notice'
  subject: string
  tone: 'cordial' | 'ferme' | 'precontentieux' | 'formal_notice'
  channel: 'email' | 'sms' | 'courrier'
}

interface Scenario {
  id: string
  name: string
  description: string
  steps: ScenarioStep[]
  badge?: string
  badgeColor?: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'standard',
    name: 'Standard',
    badge: 'Recommandé',
    badgeColor: 'bg-blue-100 text-brand-700',
    description: 'Trois rappels à J+7, J+15 et J+30. Les pauses et les promesses sont respectées.',
    steps: [
      { day: 7,  type: 'email_1', subject: 'Rappel amiable — Facture {n°}', tone: 'cordial', channel: 'email' },
      { day: 15, type: 'email_2', subject: 'Relance — Facture {n°} en retard', tone: 'ferme', channel: 'email' },
      { day: 30, type: 'email_3', subject: 'Troisième rappel — Facture en attente', tone: 'precontentieux', channel: 'email' },
    ],
  },
  {
    id: 'soft',
    name: 'Espacé',
    badge: 'Clients fidèles',
    badgeColor: 'bg-green-100 text-green-700',
    description: 'Deux rappels à J+7 et J+21 pour laisser plus de temps entre les échanges.',
    steps: [
      { day: 7,  type: 'email_1', subject: 'Petit rappel — Facture {n°}', tone: 'cordial', channel: 'email' },
      { day: 21, type: 'email_2', subject: 'Rappel — Facture {n°} toujours en attente', tone: 'cordial', channel: 'email' },
    ],
  },
  {
    id: 'firm',
    name: 'Rapproché',
    badge: 'Suivi rapproché',
    badgeColor: 'bg-orange-100 text-orange-700',
    description: 'Trois rappels rapprochés à J+3, J+10 et J+20, sans mise en demeure automatique.',
    steps: [
      { day: 3,  type: 'email_1', subject: 'Relance — Facture {n°} impayée', tone: 'ferme', channel: 'email' },
      { day: 10, type: 'email_2', subject: '2ème relance ferme — Facture {n°}', tone: 'ferme', channel: 'email' },
      { day: 20, type: 'email_3', subject: 'Ultime rappel avant procédure', tone: 'precontentieux', channel: 'email' },
    ],
  },
]

const toneConfig = {
  cordial:        { label: 'Cordial',           color: 'bg-blue-100 text-brand-700',   dot: 'bg-blue-500' },
  ferme:          { label: 'Ferme',             color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  precontentieux: { label: 'Pré-contentieux',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  formal_notice:  { label: 'Mise en demeure',   color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
}

const stepTypeLabel = {
  email_1: '1ère relance',
  email_2: '2ème relance',
  email_3: '3ème relance',
  formal_notice: 'Mise en demeure',
}

export default function ScenariosPage() {
  const { toast } = useToast()
  const [activeScenarioId, setActiveScenarioId] = useState<string>('standard')
  const [initialScenarioId, setInitialScenarioId] = useState<string>('standard')
  const [autoReminders, setAutoReminders] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [automationAvailable, setAutomationAvailable] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/profile/reminders', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.settings) throw new Error(result.error || 'Chargement impossible.')
      setAutoReminders(result.settings.auto_reminders)
      setActiveScenarioId(result.settings.active_scenario)
      setInitialScenarioId(result.settings.active_scenario)
      setAutomationAvailable(result.capabilities.automationAvailable)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadSettings() }, [loadSettings])

  const saveSettings = async (change: { auto_reminders?: boolean; active_scenario?: string }) => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile/reminders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change),
      })
      const result = await response.json()
      if (!response.ok || !result.settings) throw new Error(result.error || 'Enregistrement impossible.')
      setAutoReminders(result.settings.auto_reminders)
      setActiveScenarioId(result.settings.active_scenario)
      setAutomationAvailable(result.capabilities.automationAvailable)
      toast({ title: 'Réglages enregistrés', description: change.auto_reminders === false
        ? 'Les prochaines relances automatiques sont suspendues. Un envoi déjà en cours peut encore aboutir.'
        : 'Le scénario sera appliqué aux prochaines relances des factures vérifiées et actives.' })
    } catch (error) {
      toast({ title: 'Réglages non enregistrés', description: error instanceof Error ? error.message : 'Réessayez.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) ?? SCENARIOS[0]

  return (
    <div>
      <Header
        title="Scénarios de relance"
        description="Choisissez votre stratégie de recouvrement automatisée"
      />

      <div className="p-6 space-y-6 max-w-5xl">
        {loading && <p role="status" className="text-sm text-gray-500">Chargement de vos réglages…</p>}
        {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{loadError}</p><Button className="mt-3" variant="outline" onClick={loadSettings}>Réessayer</Button>
        </div>}
        {!loading && !loadError && !automationAvailable && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">L’envoi automatique n’est pas encore disponible.</p>
          <p className="mt-1">Vos factures restent accessibles. Vous pouvez actualiser les soldes et préparer votre scénario.</p>
        </div>}
        {/* Automation status banner */}
        <div className={`flex items-center justify-between rounded-xl border p-4 ${autoReminders && automationAvailable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${autoReminders && automationAvailable ? 'bg-green-100' : 'bg-gray-200'}`}>
              {autoReminders && automationAvailable
                ? <Bell className="h-4 w-4 text-green-600" />
                : <BellOff className="h-4 w-4 text-gray-400" />
              }
            </div>
            <div>
              <p className={`text-sm font-semibold ${autoReminders && automationAvailable ? 'text-green-800' : 'text-gray-600'}`}>
                {loading || loadError ? 'État non vérifié' : !automationAvailable ? 'Automatisation indisponible' : autoReminders ? 'Relances automatiques activées' : 'Relances automatiques désactivées'}
              </p>
              <p className={`text-xs mt-0.5 ${autoReminders && automationAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                {autoReminders && automationAvailable
                  ? `Scénario "${activeScenario.name}" actif · Envoi quotidien à 8h00 UTC`
                  : 'Choisissez un scénario et vérifiez vos soldes avant tout envoi'}
              </p>
            </div>
          </div>
          <Button
            variant={autoReminders ? 'outline' : 'default'}
            size="sm"
            onClick={() => saveSettings({ auto_reminders: !autoReminders })}
            disabled={saving || loading || Boolean(loadError) || (!autoReminders && !automationAvailable)}
            className={autoReminders ? 'border-green-300 text-green-700 hover:bg-green-100' : ''}
          >
            {saving ? '…' : autoReminders ? 'Désactiver' : 'Activer'}
          </Button>
        </div>

        {/* Retroactive warning */}
        {activeScenarioId !== initialScenarioId && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Changement de scénario — effet futur uniquement</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Le nouveau calendrier s&apos;applique à toutes vos factures actives dès le prochain passage. Les étapes déjà envoyées ne sont pas répétées ; les pauses, litiges et promesses restent respectés.
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600">Le scénario fixe les dates d’envoi. Le contenu de chaque étape se règle dans <Link href="/dashboard/templates" className="font-medium text-brand-700 underline">vos modèles email</Link>.</p>
        {/* Scenario picker */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Scénario actif</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SCENARIOS.map((scenario) => {
              const isActive = scenario.id === activeScenarioId
              return (
                <button
                  key={scenario.id}
                  onClick={() => saveSettings({ active_scenario: scenario.id })}
                  disabled={saving || loading || Boolean(loadError)}
                  aria-pressed={isActive}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all disabled:opacity-50 disabled:cursor-wait ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-brand-600" />
                    </div>
                  )}
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scenario.badgeColor}`}>
                      {scenario.badge}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900">{scenario.name}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{scenario.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {scenario.steps.map((step, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${toneConfig[step.tone].color}`}>
                        J+{step.day}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active scenario detail */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-600" />
                  Détail du scénario — {activeScenario.name}
                </CardTitle>
                <CardDescription className="mt-1">{activeScenario.description}</CardDescription>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${activeScenario.badgeColor}`}>
                {activeScenario.badge}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {activeScenario.steps.map((step, i) => {
                  const tone = toneConfig.cordial
                  return (
                    <div key={i} className="relative flex gap-4">
                      {/* Day bubble */}
                      <div className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 border-white shadow-sm z-10 ${
                        step.tone === 'formal_notice' ? 'bg-red-100 text-red-700' :
                        step.tone === 'precontentieux' ? 'bg-orange-100 text-orange-700' :
                        step.tone === 'ferme' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-brand-700'
                      }`}>
                        {step.day}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">
                            J+{step.day} — {stepTypeLabel[step.type]}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tone.color}`}>
                            Modèle personnalisable
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            {step.channel === 'email' ? 'Email' : step.channel === 'sms' ? 'SMS' : 'Courrier LRAR'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 italic">Contenu enregistré dans vos modèles email</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="pt-5">
            <div className="flex items-start gap-2 mb-4">
              <Info className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-blue-900">Comment fonctionne l&apos;automatisation ?</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Clock,
                  title: 'Un passage chaque jour',
                  body: "Lorsque le service est disponible, les relances dues sont traitées chaque jour à 8h UTC (10h en été, 9h en hiver en France).",
                },
                {
                  icon: Mail,
                  title: 'Envois protégés',
                  body: "Si une relance d'un type donné a déjà été envoyée pour une facture, elle ne sera jamais renvoyée automatiquement.",
                },
                {
                  icon: CheckCircle,
                  title: 'Vous restez maître',
                  body: "Une relance manuelle respecte aussi les pauses, les litiges, les promesses et le délai minimum de 24 heures entre deux envois.",
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                      <Icon className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{item.title}</p>
                      <p className="text-xs text-brand-700/70 mt-0.5 leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
