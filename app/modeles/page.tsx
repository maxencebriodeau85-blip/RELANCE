import Link from 'next/link'
import type { Metadata } from 'next'
import { Mail, AlertTriangle, Info, ChevronRight, ClipboardCopy } from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/footer'
import { CTA_LABEL, TRIAL_LINE } from '@/lib/plans'
import { PUBLISHER } from '@/lib/legal'
import { REMINDER_TEMPLATES } from '@/lib/reminder-templates'

export const metadata: Metadata = {
  title: 'Modèles de relance de facture — trois rappels amiables',
  description:
    "3 modèles de relance amiable à adapter au solde réel de vos factures.",
  alternates: { canonical: '/modeles' },
  openGraph: {
    title: 'Modèles de relance de facture gratuits',
    description:
      "3 modèles de relance amiable à copier et adapter.",
    type: 'website',
  },
}

const templates = REMINDER_TEMPLATES.map((template) => ({
  id: template.type, title: template.label, tone: template.tone,
  toneColor: 'bg-blue-100 text-blue-700', context: 'À adapter après vérification du destinataire et du solde restant.',
  subject: template.defaultSubject, body: template.defaultBody,
}))

export default function ModelesPage() {
  return (
    <div className="rf-site min-h-screen">
      {/* Header */}
      <SiteNav />

      <main id="main-content" className="mx-auto max-w-5xl px-5 py-8 space-y-6">
        {/* Hero */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 mb-5">
            <ClipboardCopy className="h-4 w-4" />
            3 modèles amiables à copier
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            Modèles de lettres de relance
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            3 modèles proposés par {PUBLISHER.name}, fondateur d’Encair, à adapter à votre situation.
            Ce sont les mêmes modèles de base que dans l’application. Choisissez une cadence adaptée à la situation de votre client.
          </p>
        </div>

        {/* Automation upsell */}
        <div className="rounded-2xl bg-[#182b40] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-white">
              Préparez vos relances email dans Encair
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              Encair remplit ces modèles avec le solde restant et les données de votre facture. Vérifiez-les avant un envoi manuel ou l’activation d’un scénario automatique. La mise en demeure n’est pas incluse.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="flex-shrink-0 rounded-xl bg-white text-blue-700 font-bold text-sm px-5 py-2.5 hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            {CTA_LABEL}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Templates */}
        <div className="space-y-5">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">{tpl.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.context}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${tpl.toneColor}`}>
                  {tpl.tone}
                </span>
              </div>

              {/* Subject */}
              <div className="px-6 py-3 border-b bg-blue-50/50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Objet :</span>
                <span className="text-sm text-gray-800 font-medium">{tpl.subject}</span>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {tpl.body}
                </pre>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Info className="h-3.5 w-3.5 text-amber-500" />
                  À adapter — pénalités et 40 € : clients professionnels uniquement
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Variables entre {'{}'} à remplacer</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="rounded-2xl border bg-white p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Moins de copier-coller, aucune relance oubliée
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Encair remplit les variables avec les données de chaque facture et vous rappelle quoi relancer ; vous validez chaque envoi.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#182b40] text-white font-bold px-6 py-3 transition-all hover:bg-[#294059]"
          >
            {CTA_LABEL}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-gray-500 mt-3">{TRIAL_LINE}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
