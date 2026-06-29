import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Sparkles, Bug, Zap, Layers } from 'lucide-react'
import { SiteFooter } from '@/components/landing/footer'
import { Logo } from '@/components/brand/logo'

export const metadata: Metadata = {
  title: 'Changelog — Nouveautés RelanceFlow',
  description:
    "Toutes les nouveautés, améliorations et correctifs de RelanceFlow, par ordre chronologique.",
  alternates: { canonical: '/changelog' },
}

type EntryType = 'feature' | 'improvement' | 'fix'

interface Entry {
  date: string
  version: string
  type: EntryType
  title: string
  items: string[]
}

const TYPE_META: Record<EntryType, { label: string; icon: typeof Sparkles; cls: string }> = {
  feature: { label: 'Nouveau', icon: Sparkles, cls: 'bg-brand-100 text-brand-700' },
  improvement: { label: 'Amélioration', icon: Zap, cls: 'bg-amber-100 text-amber-700' },
  fix: { label: 'Correctif', icon: Bug, cls: 'bg-emerald-100 text-emerald-700' },
}

const ENTRIES: Entry[] = [
  {
    date: '2026-06-29',
    version: '1.5.0',
    type: 'feature',
    title: 'Identité visuelle, command palette & PWA',
    items: [
      "Nouvelle identité visuelle : palette indigo profond, font display Plus Jakarta Sans, logo signature avec icône flow",
      "Command palette dashboard (⌘K / Ctrl+K) pour naviguer instantanément entre les écrans",
      "PWA installable sur mobile et desktop, image Open Graph générée à la volée",
      "Bandeau cookies RGPD conforme CNIL",
      "Menu mobile hamburger sur la landing",
    ],
  },
  {
    date: '2026-06-29',
    version: '1.4.0',
    type: 'fix',
    title: 'Sécurité & cohérence — code review xhigh',
    items: [
      "Webhook Resend : vraie vérification de signature Svix (timestamp + HMAC + replay protection 5 min)",
      "Cron de relances : utilise enfin les templates personnalisés",
      "XSS bouché sur le formulaire de contact (escape HTML)",
      "Injection HTTP de header bouchée sur le téléchargement PDF (sanitize filename)",
      "Race condition email de bienvenue éliminée par UPDATE atomique",
      "Calculateur de pénalités : calcul UTC strict (plus d'off-by-one selon fuseau)",
      "Prix cohérents entre Stripe, landing, settings et JSON-LD (19/49/99 €)",
    ],
  },
  {
    date: '2026-06-29',
    version: '1.3.0',
    type: 'feature',
    title: 'Contenu SEO et outils gratuits',
    items: [
      "3 guides longs sur le recouvrement (mise en demeure, amiable vs contentieux, DSO)",
      "Calculateur public de pénalités de retard (art. L441-10 + D441-5 C.com.)",
      "Page contact avec formulaire anti-bot honeypot",
      "Comparatif détaillé vs Pennylane / Sellsy / Excel",
      "Tracking ouvertures, clics et rebonds des emails dans la timeline des factures",
    ],
  },
  {
    date: '2026-06-29',
    version: '1.2.0',
    type: 'feature',
    title: 'Personnalisation et conversion',
    items: [
      "Éditeur de templates de relance avec preview live et variables {{client_name}}, {{amount}}…",
      "Webhook Resend pour engagement tracking (delivered / opened / clicked / bounced)",
      "Email de bienvenue auto à l'inscription (idempotent)",
      "Onboarding wizard 4 étapes au premier login",
      "Téléchargement PDF des factures conforme aux mentions légales françaises",
      "Pricing 3 plans avec toggle mensuel/annuel (-2 mois)",
      "Section témoignages remplacée par un récit early access honnête (audit interne — on ne montre pas de chiffres tant qu'ils ne sont pas mesurés sur de vrais clients nommables)",
    ],
  },
  {
    date: '2026-06-29',
    version: '1.1.0',
    type: 'improvement',
    title: 'Audit commercial',
    items: [
      "Bannière d'upgrade dans le dashboard à 80 % de la limite mensuelle",
      "Bouton de paiement dans les emails cordial et ferme (plus seulement la mise en demeure)",
      "Filtres rapides factures (toutes / non payées / en retard / >30 j)",
      "Cohérence des noms de plan partout (Starter au lieu de Solo)",
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white mb-4 shadow-lg shadow-brand-500/30">
            <Layers className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Changelog
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            On expédie souvent. Voici tout ce qui a changé récemment.
          </p>
        </div>

        <div className="space-y-10">
          {ENTRIES.map((entry) => {
            const meta = TYPE_META[entry.type]
            const Icon = meta.icon
            return (
              <article key={`${entry.date}-${entry.version}`} className="relative">
                <div className="flex flex-wrap items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-gray-500">
                    {new Date(entry.date).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    v{entry.version}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${meta.cls}`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-gray-900 mb-3">{entry.title}</h2>

                <ul className="space-y-2">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="text-brand-500 flex-shrink-0 mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>

        <div className="mt-16 rounded-2xl border border-brand-100 bg-brand-50/50 p-6 text-center">
          <p className="text-sm text-gray-700 mb-3">
            Une feature qui vous manque ? Un bug à signaler ?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2 transition-all"
          >
            Écrivez-nous →
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
