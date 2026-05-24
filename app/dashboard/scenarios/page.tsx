'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'

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
    badgeColor: 'bg-blue-100 text-blue-700',
    description: 'Couverture complète de J+7 à J+45. Convient à 80 % des situations — passe de cordial à ferme puis pré-contentieux.',
    steps: [
      { day: 7,  type: 'email_1', subject: 'Rappel amiable — Facture {n°}', tone: 'cordial', channel: 'email' },
      { day: 15, type: 'email_2', subject: 'Relance — Facture {n°} en retard', tone: 'ferme', channel: 'email' },
      { day: 30, type: 'email_2', subject: '2ème relance — Action requise', tone: 'ferme', channel: 'email' },
      { day: 45, type: 'email_3', subject: 'Dernière relance avant mise en demeure', tone: 'precontentieux', channel: 'email' },
    ],
  },
  {
    id: 'soft',
    name: 'Soft',
    badge: 'Clients fidèles',
    badgeColor: 'bg-green-100 text-green-700',
    description: 'Deux rappels doux espacés. Pour les bons payeurs habituels — préserve la relation commerciale.',
    steps: [
      { day: 7,  type: 'email_1', subject: 'Petit rappel — Facture {n°}', tone: 'cordial', channel: 'email' },
      { day: 21, type: 'email_2', subject: 'Rappel — Facture {n°} toujours en attente', tone: 'cordial', channel: 'email' },
    ],
  },
  {
    id: 'firm',
    name: 'Ferme',
    badge: 'Mauvais payeurs',
    badgeColor: 'bg-orange-100 text-orange-700',
    description: 'Escalade rapide avec mise en demeure. Pour les clients avec historique de retard ou montants importants.',
    steps: [
      { day: 7,  type: 'email_1', subject: 'Relance — Facture {n°} impayée', tone: 'ferme', channel: 'email' },
      { day: 15, type: 'email_2', subject: '2ème relance ferme — Facture {n°}', tone: 'ferme', channel: 'email' },
      { day: 30, type: 'email_3', subject: 'Ultime rappel avant procédure', tone: 'precontentieux', channel: 'email' },
      { day: 45, type: 'formal_notice', subject: 'MISE EN DEMEURE — Facture {n°}', tone: 'formal_notice', channel: 'email' },
    ],
  },
]

const toneConfig = {
  cordial:        { label: 'Cordial',           color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
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
  const [autoReminders, setAutoReminders] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('auto_reminders')
          .eq('id', user.id)
          .single()

        if (data) {
          setAutoReminders((data as any).auto_reminders ?? true)
          const saved = (data as any).active_scenario
          if (saved && SCENARIOS.find((s) => s.id === saved)) {
            setActiveScenarioId(saved)
          }
        }
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSelectScenario = async (id: string) => {
    setActiveScenarioId(id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ active_scenario: id } as never).eq('id', user.id)
      }
    } catch { /* silent — scenario still applied locally */ }
  }

  const handleToggleAutoReminders = async () => {
    const next = !autoReminders
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error()
      await supabase.from('profiles').update({ auto_reminders: next } as never).eq('id', user.id)
      setAutoReminders(next)
      toast({
        title: next ? 'Relances automatiques activées' : 'Relances automatiques désactivées',
        description: next
          ? 'Le cron quotidien à 8h00 appliquera le scénario actif.'
          : 'Plus aucune relance ne partira automatiquement.',
      })
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) ?? SCENARIOS[0]

  return (
    <div>
      <Header
        title="Scénarios de relance"
        description="Choisissez votre stratégie de recouvrement automatisée"
      />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Automation status banner */}
        <div className={`flex items-center justify-between rounded-xl border p-4 ${autoReminders ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${autoReminders ? 'bg-green-100' : 'bg-gray-200'}`}>
              {autoReminders
                ? <Bell className="h-4 w-4 text-green-600" />
                : <BellOff className="h-4 w-4 text-gray-400" />
              }
            </div>
            <div>
              <p className={`text-sm font-semibold ${autoReminders ? 'text-green-800' : 'text-gray-600'}`}>
                {autoReminders ? 'Relances automatiques activées' : 'Relances automatiques désactivées'}
              </p>
              <p className={`text-xs mt-0.5 ${autoReminders ? 'text-green-600' : 'text-gray-400'}`}>
                {autoReminders
                  ? `Scénario "${activeScenario.name}" actif · Envoi quotidien à 8h00 UTC`
                  : 'Vous devez déclencher les relances manuellement depuis chaque facture'}
              </p>
            </div>
          </div>
          <Button
            variant={autoReminders ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggleAutoReminders}
            disabled={saving || loading}
            className={autoReminders ? 'border-green-300 text-green-700 hover:bg-green-100' : ''}
          >
            {saving ? '…' : autoReminders ? 'Désactiver' : 'Activer'}
          </Button>
        </div>

        {/* Scenario picker */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Scénario actif</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SCENARIOS.map((scenario) => {
              const isActive = scenario.id === activeScenarioId
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleSelectScenario(scenario.id)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
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
                  <Zap className="h-4 w-4 text-blue-600" />
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
                  const tone = toneConfig[step.tone]
                  return (
                    <div key={i} className="relative flex gap-4">
                      {/* Day bubble */}
                      <div className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 border-white shadow-sm z-10 ${
                        step.tone === 'formal_notice' ? 'bg-red-100 text-red-700' :
                        step.tone === 'precontentieux' ? 'bg-orange-100 text-orange-700' :
                        step.tone === 'ferme' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {step.day}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">
                            J+{step.day} — {stepTypeLabel[step.type]}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tone.color}`}>
                            {tone.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail className="h-3 w-3" />
                            {step.channel === 'email' ? 'Email' : step.channel === 'sms' ? 'SMS' : 'Courrier LRAR'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 italic">{step.subject}</p>
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
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-blue-900">Comment fonctionne l&apos;automatisation ?</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Clock,
                  title: 'Chaque matin à 8h00',
                  body: "Un job automatique analyse toutes vos factures impayées et déclenche les relances dues selon le scénario actif.",
                },
                {
                  icon: Mail,
                  title: 'Zéro doublon',
                  body: "Si une relance d'un type donné a déjà été envoyée pour une facture, elle ne sera jamais renvoyée automatiquement.",
                },
                {
                  icon: CheckCircle,
                  title: 'Vous restez maître',
                  body: "Vous pouvez envoyer une relance manuellement à tout moment depuis la page facture, indépendamment du cron.",
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">{item.title}</p>
                      <p className="text-xs text-blue-700/70 mt-0.5 leading-relaxed">{item.body}</p>
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
