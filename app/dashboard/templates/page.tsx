'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Mail, RotateCcw, Save, Variable, Info } from 'lucide-react'
import Link from 'next/link'

import { REMINDER_TEMPLATES as TEMPLATES, TEMPLATE_VARIABLES as VARIABLES, type EditableReminderType as TemplateType } from '@/lib/reminder-templates'

type Template = typeof TEMPLATES[number]

interface TemplateOverride {
  template_type: TemplateType
  subject: string
  body: string
  enabled: boolean
}

// Sample data used to render a live preview of the template as the user types.
const PREVIEW_VARS: Record<string, string> = {
  client_name: 'Acme Corp',
  invoice_number: 'F-2026-042',
  amount: '2 400,00 €',
  due_date: '15 mars 2026',
  days_overdue: '12',
  creditor_name: 'Mon Entreprise',
  creditor_email: 'contact@mon-entreprise.fr',
  payment_url: '',
  description: 'Mission de conseil — janvier 2026',
}

function previewInterpolate(s: string): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => PREVIEW_VARS[k] ?? `{{${k}}}`)
}

function previewEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [overrides, setOverrides] = useState<Record<string, TemplateOverride>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, TemplateOverride>>({})
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/email-templates', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.templates)) throw new Error(data.error || 'Chargement des modèles impossible.')
      const map = Object.fromEntries(data.templates.filter((t: TemplateOverride) => t.enabled).map((t: TemplateOverride) => [t.template_type, t]))
      setOverrides(map)
      setSaved(map)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  // O(1) template lookup instead of TEMPLATES.find() on every keystroke
  const templateByType = useMemo(
    () => Object.fromEntries(TEMPLATES.map((t) => [t.type, t])) as Record<TemplateType, Template>,
    []
  )

  const handleEdit = useCallback(
    (type: TemplateType, field: 'subject' | 'body', value: string) => {
      const tpl = templateByType[type]
      setOverrides((prev) => ({
        ...prev,
        [type]: {
          template_type: type,
          subject: prev[type]?.subject ?? tpl.defaultSubject,
          body: prev[type]?.body ?? tpl.defaultBody,
          enabled: true,
          [field]: value,
        },
      }))
    },
    [templateByType]
  )

  const handleSave = async (type: TemplateType) => {
    const tpl = TEMPLATES.find((t) => t.type === type)!
    const override = overrides[type] || {
      template_type: type,
      subject: tpl.defaultSubject,
      body: tpl.defaultBody,
      enabled: true,
    }
    setSaving(type)
    setErrors(prev => ({ ...prev, [type]: '' }))
    try {
      const res = await fetch('/api/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...override, enabled: true }),
      })
      const result = await res.json()
      if (!res.ok || !result.template) throw new Error(result.error || 'Enregistrement impossible.')
      setOverrides(prev => ({ ...prev, [type]: result.template }))
      setSaved(prev => ({ ...prev, [type]: result.template }))
      toast({ title: 'Modèle enregistré', description: `Le modèle « ${tpl.label} » sera utilisé pour vos prochains envois.` })
    } catch (error) {
      setErrors(prev => ({ ...prev, [type]: error instanceof Error ? error.message : 'Enregistrement impossible. Réessayez.' }))
    } finally {
      setSaving(null)
    }
  }

  const handleReset = async (type: TemplateType) => {
    setSaving(type)
    setErrors(prev => ({ ...prev, [type]: '' }))
    try {
      const response = await fetch(`/api/email-templates?type=${type}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Réinitialisation impossible.')
      setSaved(prev => { const next = { ...prev }; delete next[type]; return next })
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[type]
        return next
      })
      toast({ title: 'Modèle réinitialisé', description: 'Le modèle par défaut sera utilisé.' })
    } catch (error) {
      setErrors(prev => ({ ...prev, [type]: error instanceof Error ? error.message : 'Réinitialisation impossible.' }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <Header
        title="Modèles de relance"
        description="Personnalisez le ton, l'objet et le corps des emails envoyés à vos clients."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings">← Retour aux paramètres</Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Les modèles par défaut sont des relances amiables sans pénalités automatiques. Vérifiez vos textes personnalisés : les mentions de l’article L441-10 et de l’indemnité de 40 € concernent les relations entre professionnels, pas les clients particuliers.</p>
        {/* Concept primer */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-purple-50 border border-brand-100 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Comment ça fonctionne</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            La personnalisation est incluse pendant votre essai et dans l’offre Fondateur.
            Vous pouvez modifier l’objet et le message de chaque étape. Les variables comme <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{'{{client_name}}'}</code> sont
            interpolées au moment de l&apos;envoi.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Les dates d’envoi dépendent du scénario choisi. Ces modèles servent aux trois relances amiables, sans envoi automatique de mise en demeure.
            Cliquez sur « Réinitialiser » pour revenir au défaut à tout moment.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Variables disponibles</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLES.map((v) => (
                <code
                  key={v.name}
                  title={v.desc}
                  className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-2 py-0.5 font-mono cursor-help"
                >
                  {`{{${v.name}}}`}
                </code>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{loadError}</p><Button variant="outline" className="mt-3" onClick={load}>Réessayer</Button>
        </div>}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-white p-5 space-y-3">
                <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                <div className="h-9 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-40 w-full rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !loadError && (
          TEMPLATES.map((tpl) => {
            const override = overrides[tpl.type]
            const subject = override?.subject ?? tpl.defaultSubject
            const body = override?.body ?? tpl.defaultBody
            const isCustomized = !!saved[tpl.type]?.enabled
            const dirty = subject !== (saved[tpl.type]?.subject ?? tpl.defaultSubject) || body !== (saved[tpl.type]?.body ?? tpl.defaultBody)
            return (
              <Card key={tpl.type} data-testid={`template-${tpl.type}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4" />
                        {tpl.label}
                        {isCustomized && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-brand-700 rounded px-1.5 py-0.5">
                            Personnalisé
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{tpl.tone}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label htmlFor={`subject-${tpl.type}`} className="text-xs font-semibold text-gray-700 mb-1.5 block">Objet de l&apos;email</label>
                    <Input
                      id={`subject-${tpl.type}`}
                      disabled={saving !== null}
                      value={subject}
                      onChange={(e) => handleEdit(tpl.type, 'subject', e.target.value)}
                      className="font-mono text-sm"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label htmlFor={`body-${tpl.type}`} className="text-xs font-semibold text-gray-700 mb-1.5 block">Corps du message</label>
                    <textarea
                      id={`body-${tpl.type}`}
                      disabled={saving !== null}
                      value={body}
                      onChange={(e) => handleEdit(tpl.type, 'body', e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={5000}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      {body.length} / 5000 caractères. Utilisez les variables ci-dessus.
                    </p>
                  </div>

                  {dirty && <p role="status" className="text-xs text-amber-800">Modifications non enregistrées</p>}
                  {errors[tpl.type] && <p role="alert" className="text-sm text-red-700">{errors[tpl.type]}</p>}
                  {/* Live preview */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    <div className="px-3 py-2 bg-white border-b border-gray-100 text-[11px] uppercase font-bold tracking-wider text-gray-400">
                      Aperçu (avec données d&apos;exemple)
                    </div>
                    <div className="p-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Objet</div>
                      <div className="text-sm font-medium text-gray-900 mb-3">
                        {previewInterpolate(subject)}
                      </div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">Corps</div>
                      <div
                        className="text-sm text-gray-800 bg-white rounded border border-gray-100 p-3 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: previewEscape(previewInterpolate(body)),
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    {(isCustomized || dirty) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(tpl.type)}
                        disabled={saving !== null}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Réinitialiser
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Variable className="h-3 w-3" /> Modèle par défaut actif
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSave(tpl.type)}
                      disabled={saving !== null}
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {saving === tpl.type ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
