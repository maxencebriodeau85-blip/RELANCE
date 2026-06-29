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

type TemplateType = 'email_1' | 'email_2' | 'email_3' | 'formal_notice'

interface Template {
  type: TemplateType
  label: string
  defaultSubject: string
  defaultBody: string
  description: string
  tone: string
}

const TEMPLATES: Template[] = [
  {
    type: 'email_1',
    label: '1ère relance — Cordiale',
    tone: 'J+7 après échéance · ton cordial',
    description: "Premier rappel doux. Souvent ignoré si trop poli, donc rester direct.",
    defaultSubject: 'Rappel amiable – Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

Nous nous permettons de vous contacter concernant la facture n°{{invoice_number}} d'un montant de {{amount}}, dont l'échéance était le {{due_date}}.

Si le règlement a déjà été effectué, ignorez ce message.
Dans le cas contraire, merci de procéder au paiement dès que possible.

Cordialement,
{{creditor_name}}`,
  },
  {
    type: 'email_2',
    label: '2ème relance — Ferme',
    tone: 'J+15 après échéance · ton ferme',
    description: "Deuxième relance, plus pressante. Mention des pénalités légales.",
    defaultSubject: 'Relance – Facture n°{{invoice_number}} en attente de règlement',
    defaultBody: `Bonjour {{client_name}},

Malgré notre premier rappel, nous n'avons pas reçu le règlement de la facture n°{{invoice_number}} ({{amount}}), en retard de {{days_overdue}} jours.

Des pénalités de retard sont applicables (art. L441-10 C.com.).

Merci de procéder au règlement sous 8 jours pour éviter toute procédure de recouvrement.

Cordialement,
{{creditor_name}}`,
  },
  {
    type: 'email_3',
    label: '3ème relance — Pré-contentieux',
    tone: 'J+30 après échéance · dernier avertissement',
    description: "Dernier avertissement avant mise en demeure officielle.",
    defaultSubject: 'URGENT – Dernière relance avant mise en demeure – Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

Malgré nos relances, la facture n°{{invoice_number}} ({{amount}}) est en souffrance depuis {{days_overdue}} jours.

Sans règlement sous 8 jours, nous procéderons à une mise en demeure par lettre recommandée, préalable à toute action judiciaire de recouvrement.

Cette procédure engendrera des frais supplémentaires à votre charge.

Cordialement,
{{creditor_name}}`,
  },
  {
    type: 'formal_notice',
    label: 'Mise en demeure',
    tone: 'J+45+ · acte légal formel',
    description: "Mise en demeure au sens de l'art. 1344 du Code civil.",
    defaultSubject: 'MISE EN DEMEURE – Facture n°{{invoice_number}}',
    defaultBody: `Bonjour {{client_name}},

Par la présente, nous vous adressons une MISE EN DEMEURE de régler la facture n°{{invoice_number}} ({{amount}}), impayée depuis {{days_overdue}} jours.

Vous êtes mis en demeure de procéder au règlement sous 8 jours à compter de la réception de ce courrier.

À défaut, nous engagerons toute procédure judiciaire de recouvrement (injonction de payer, assignation en référé), frais et dépens à votre charge.

Ce courrier a valeur de mise en demeure au sens de l'art. 1344 du Code civil.

{{creditor_name}}`,
  },
]

const VARIABLES = [
  { name: 'client_name', desc: 'Nom du client' },
  { name: 'invoice_number', desc: 'N° de facture' },
  { name: 'amount', desc: 'Montant TTC formaté' },
  { name: 'due_date', desc: 'Date d\'échéance' },
  { name: 'days_overdue', desc: 'Jours de retard' },
  { name: 'creditor_name', desc: 'Votre nom commercial' },
  { name: 'payment_url', desc: 'Lien de paiement Stripe' },
  { name: 'description', desc: 'Désignation de la prestation' },
]

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
  payment_url: 'https://relanceflow.fr/pay/sample-token',
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

  useEffect(() => {
    fetch('/api/email-templates')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, TemplateOverride> = {}
        for (const t of data.templates || []) {
          map[t.template_type] = t
        }
        setOverrides(map)
      })
      .finally(() => setLoading(false))
  }, [])

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
          enabled: prev[type]?.enabled ?? true,
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
    try {
      const res = await fetch('/api/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override),
      })
      if (!res.ok) throw new Error('save failed')
      toast({ title: 'Template enregistré', description: `Le template "${tpl.label}" est actif.` })
    } catch {
      toast({ title: 'Erreur', description: 'Sauvegarde impossible.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const handleReset = async (type: TemplateType) => {
    setSaving(type)
    try {
      await fetch(`/api/email-templates?type=${type}`, { method: 'DELETE' })
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[type]
        return next
      })
      toast({ title: 'Template réinitialisé', description: "Le template par défaut sera utilisé." })
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <Header
        title="Templates de relance"
        description="Personnalisez le ton, l'objet et le corps des emails envoyés à vos clients."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings">← Retour aux paramètres</Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Concept primer */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-purple-50 border border-brand-100 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Comment ça fonctionne</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Chaque relance utilise un template par défaut conçu par notre équipe.
            Vous pouvez le remplacer ici par votre propre version : objet, corps,
            ton. Les variables comme <code className="text-xs bg-white px-1 py-0.5 rounded border border-gray-200">{'{{client_name}}'}</code> sont
            interpolées au moment de l&apos;envoi.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Un template par défaut est actif tant que vous n&apos;avez pas enregistré le vôtre.
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
        ) : (
          TEMPLATES.map((tpl) => {
            const override = overrides[tpl.type]
            const subject = override?.subject ?? tpl.defaultSubject
            const body = override?.body ?? tpl.defaultBody
            const isCustomized = !!override
            return (
              <Card key={tpl.type}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4" />
                        {tpl.label}
                        {isCustomized && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
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
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Objet de l&apos;email</label>
                    <Input
                      value={subject}
                      onChange={(e) => handleEdit(tpl.type, 'subject', e.target.value)}
                      className="font-mono text-sm"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Corps du message</label>
                    <textarea
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
                    {isCustomized ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(tpl.type)}
                        disabled={saving === tpl.type}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Réinitialiser
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Variable className="h-3 w-3" /> Template par défaut actif
                      </span>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleSave(tpl.type)}
                      disabled={saving === tpl.type}
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
