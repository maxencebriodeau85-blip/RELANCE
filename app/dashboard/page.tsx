import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  calculateDashboardMetrics,
  formatEuro,
  formatDate,
  getDaysOverdue,
  PLAN_LIMITS,
} from '@/lib/metrics'
import { StatusBadge } from '@/components/invoices/status-badge'
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard'
import { CountUp } from '@/components/dashboard/count-up'
import type { Invoice, Profile } from '@/lib/database.types'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Upload,
  ArrowRight,
  FileText,
  Send,
  BarChart3,
  Bell,
  ChevronRight,
  Kanban,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function kpiCard({
  label,
  value,
  sub,
  accent,
  help,
  numeric,
  numFormat,
}: {
  label: string
  value: string
  sub: string
  accent: 'blue' | 'red' | 'green' | 'gray'
  help?: string
  /** When provided, the KPI counts up on load (DA animation) instead of
      rendering the static `value` string. */
  numeric?: number
  numFormat?: 'euro' | 'int' | 'days' | 'percent'
}) {
  const accents = {
    blue: { val: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', dot: 'bg-blue-500' },
    red: { val: 'text-red-600', bg: 'bg-red-50 border-red-100', dot: 'bg-red-500' },
    green: { val: 'text-green-600', bg: 'bg-green-50 border-green-100', dot: 'bg-green-500' },
    gray: { val: 'text-gray-800', bg: 'bg-white border-gray-100', dot: 'bg-gray-400' },
  }
  const c = accents[accent]
  return (
    <div
      className={`group/kpi relative rounded-xl border ${c.bg} px-5 py-4 shadow-soft`}
      title={help}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        {help && (
          <span
            aria-hidden="true"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[9px] font-bold text-gray-400 cursor-help"
          >
            i
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.val} leading-none`}>
        {numeric !== undefined ? <CountUp value={numeric} format={numFormat} /> : value}
      </p>
      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {sub}
      </p>

      {/* Tooltip on hover/focus */}
      {help && (
        <div className="pointer-events-none absolute left-0 right-0 -top-2 -translate-y-full z-10 opacity-0 group-hover/kpi:opacity-100 transition-opacity duration-150">
          <div className="mx-2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg leading-relaxed">
            {help}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // ── auth: unauthenticated users go to login, not demo ──────────────────────
  let invoices: Invoice[] = []
  let profile: Profile | null = null
  let contacts: { id: string; pipeline_stage: string; deal_amount: number | null }[] = []

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/auth/login')

    const [profileRes, invoicesRes, contactsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('contacts')
        .select('id, pipeline_stage, deal_amount')
        .eq('user_id', user.id),
    ])

    profile = (profileRes.data as Profile) ?? null
    invoices = (invoicesRes.data as Invoice[]) ?? []
    contacts = (contactsRes.data as { id: string; pipeline_stage: string; deal_amount: number | null }[]) ?? []
  } catch {
    redirect('/auth/login')
  }

  // ── metrics ────────────────────────────────────────────────────────────────
  const metrics = calculateDashboardMetrics(invoices)
  const today = new Date()

  // Plan limit banner — uses the createdThisMonth count already computed in metrics.
  const monthlyInvoiceCount = metrics.createdThisMonth
  const planLimit = PLAN_LIMITS[profile?.plan ?? 'free_trial'] ?? PLAN_LIMITS.free_trial
  const limitPct = planLimit > 0 ? (monthlyInvoiceCount / planLimit) * 100 : 0
  const showLimitBanner = limitPct >= 80 && profile?.plan !== 'business'

  const urgentInvoices = invoices
    .filter(
      (inv) =>
        inv.status !== 'paid' &&
        inv.status !== 'disputed' &&
        getDaysOverdue(inv) > 0
    )
    .sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a))

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const hasInvoices = invoices.length > 0
  const companyName = profile?.company_name ?? null
  const profileComplete = !!(profile?.company_name && profile?.siren)
  const onboardingDone = [true, profileComplete].filter(Boolean).length // step 1 always actionable
  const showOnboarding = !!profile && !profile.onboarding_completed_at

  const todayLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // ── EMPTY STATE (new user) ─────────────────────────────────────────────────
  if (!hasInvoices) {
    return (
      <div className="min-h-full bg-gray-50">
        {showOnboarding && <OnboardingWizard />}
        {/* Page header */}
        <div className="bg-white border-b px-6 py-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-400 capitalize mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/invoices/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importer CSV
            </Link>
            <Link
              href="/dashboard/invoices/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouvelle facture
            </Link>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Welcome */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-white px-6 py-7 shadow-elevated">
            <div className="brand-orb bg-brand-500/30 h-[220px] w-[220px] -top-16 -right-10" />
            <div className="relative">
              <p className="text-white/60 text-sm mb-1">Bienvenue sur RelanceFlow</p>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                {companyName ? `Bonjour, ${companyName}` : 'Ton espace est prêt'}
              </h2>
              <p className="text-white/70 text-sm mt-2 max-w-xl leading-relaxed">
                Commence par importer tes factures impayées. RelanceFlow se charge ensuite
                d&apos;envoyer les relances automatiquement selon le scénario que tu choisis.
              </p>
              <div className="mt-5 flex gap-3">
                <Link
                  href="/dashboard/invoices/import"
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-ink-950 px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Importer un CSV
                </Link>
                <Link
                  href="/dashboard/invoices/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 text-white px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Saisir manuellement
                </Link>
              </div>
            </div>
          </div>

          {/* KPIs empty */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiCard({ label: 'Créances en cours', value: '0 €', sub: '0 facture active', accent: 'blue' })}
            {kpiCard({ label: 'Montant en retard', value: '0 €', sub: '0 facture en souffrance', accent: 'red' })}
            {kpiCard({ label: 'Récupéré ce mois', value: '0 €', sub: 'Taux de recouvrement : —', accent: 'green' })}
            {kpiCard({ label: 'DSO moyen', value: '—', sub: 'Délai de paiement moyen', accent: 'gray' })}
          </div>

          {/* Getting started steps */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Démarrage — 3 étapes</h3>
                <p className="text-xs text-gray-500 mt-0.5">Complétez ces étapes pour activer votre recouvrement automatique</p>
              </div>
              <span className={`text-xs font-medium rounded-full px-3 py-1 ${onboardingDone >= 2 ? 'bg-green-100 text-green-700' : 'text-gray-400 bg-gray-100'}`}>
                {onboardingDone} / 3
              </span>
            </div>
            <div className="divide-y">
              {[
                {
                  n: 1,
                  icon: Upload,
                  title: 'Importez vos factures impayées',
                  desc: 'Glissez-déposez un CSV depuis votre logiciel (Sage, Ciel, QuickBooks, FreshBooks…) ou saisissez manuellement.',
                  href: '/dashboard/invoices/import',
                  cta: 'Importer maintenant',
                  done: false,
                  active: true,
                },
                {
                  n: 2,
                  icon: Bell,
                  title: 'Choisissez votre scénario de relance',
                  desc: 'Cordial (J+7), Ferme (J+15/J+30) ou Pré-contentieux (J+45). Chaque étape est automatique.',
                  href: '/dashboard/scenarios',
                  cta: 'Voir les scénarios',
                  done: false,
                  active: false,
                },
                {
                  n: 3,
                  icon: FileText,
                  title: 'Complétez votre profil entreprise',
                  desc: 'Raison sociale et SIREN figurent dans vos mises en demeure et emails de relance.',
                  href: '/dashboard/settings',
                  cta: profileComplete ? 'Profil complet ✓' : 'Configurer',
                  done: profileComplete,
                  active: !profileComplete,
                },
              ].map((step) => {
                const Icon = step.icon
                return (
                  <Link
                    key={step.n}
                    href={step.href}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        step.done
                          ? 'bg-green-100 text-green-600'
                          : step.active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step.done ? <CheckCircle className="h-4 w-4" /> : step.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className={`text-sm font-semibold ${step.done ? 'text-green-700 line-through opacity-60' : step.active ? 'text-blue-700' : 'text-gray-700'}`}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className={`text-xs font-medium ${step.done ? 'text-green-600' : step.active ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step.cta}
                      </span>
                      {!step.done && <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: TrendingUp,
                title: '+34% de créances récupérées',
                body: 'Les entreprises utilisant RelanceFlow récupèrent en moyenne 34 % de créances supplémentaires par rapport aux relances manuelles.',
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                icon: Clock,
                title: '3h économisées chaque semaine',
                body: 'Les relances partent automatiquement selon le scénario configuré — même pendant vos congés ou week-ends.',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                icon: FileText,
                title: 'Mise en demeure en 1 clic',
                body: 'Document conforme droit français (art. L441-10 C. com.) avec calcul automatique des pénalités de retard légales.',
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-xl border bg-white p-5">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${item.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── FULL DASHBOARD (user has invoices) ─────────────────────────────────────

  const overdueTotal = urgentInvoices.reduce((s, inv) => s + inv.amount, 0)

  // Pipeline stats
  const pipelineStages = ['prospect', 'qualified', 'proposal', 'signed', 'lost'] as const
  const pipelineCounts = Object.fromEntries(
    pipelineStages.map(s => [s, contacts.filter(c => c.pipeline_stage === s).length])
  )
  const pipelineValue = contacts
    .filter(c => c.pipeline_stage !== 'lost')
    .reduce((s, c) => s + (c.deal_amount || 0), 0)
  const signedValue = contacts
    .filter(c => c.pipeline_stage === 'signed')
    .reduce((s, c) => s + (c.deal_amount || 0), 0)

  return (
    <div className="min-h-full bg-gray-50">
      {showOnboarding && <OnboardingWizard />}
      {/* Page header */}
      <div className="bg-white border-b px-6 py-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/invoices/import"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Link>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:shadow-brand-500/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-7xl">
        {/* Urgent alert */}
        {urgentInvoices.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    {urgentInvoices.length} facture{urgentInvoices.length > 1 ? 's' : ''} nécessite{urgentInvoices.length > 1 ? 'nt' : ''} une action immédiate
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {formatEuro(overdueTotal)} de créances en souffrance
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/invoices"
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Traiter les urgences
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Plan limit banner */}
        {showLimitBanner && (
          <div className={`rounded-xl border px-5 py-4 ${limitPct >= 100 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${limitPct >= 100 ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <AlertTriangle className={`h-4 w-4 ${limitPct >= 100 ? 'text-red-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${limitPct >= 100 ? 'text-red-900' : 'text-amber-900'}`}>
                    {limitPct >= 100
                      ? `Limite atteinte — ${monthlyInvoiceCount}/${planLimit} factures ce mois`
                      : `${monthlyInvoiceCount}/${planLimit} factures utilisées ce mois (${Math.round(limitPct)}%)`}
                  </p>
                  <p className={`text-xs mt-0.5 ${limitPct >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    {profile?.plan === 'free_trial'
                      ? 'Passez à Starter (19 €/mois) pour 30 factures/mois.'
                      : 'Passez à Pro (49 €/mois) pour 200 factures/mois.'}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings"
                className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${limitPct >= 100 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                Changer de plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCard({
            label: 'Créances en cours',
            value: formatEuro(metrics.totalReceivables),
            numeric: metrics.totalReceivables,
            numFormat: 'euro',
            sub: `${metrics.invoiceCount} facture${metrics.invoiceCount > 1 ? 's' : ''} active${metrics.invoiceCount > 1 ? 's' : ''}`,
            accent: 'blue',
            help: "Total TTC des factures non payées (pending, reminded, formal_notice). Exclut les factures payées et en litige.",
          })}
          {kpiCard({
            label: 'Montant en retard',
            value: formatEuro(metrics.totalOverdue),
            numeric: metrics.totalOverdue,
            numFormat: 'euro',
            sub: `${metrics.overdueCount} facture${metrics.overdueCount > 1 ? 's' : ''} en souffrance`,
            accent: metrics.overdueCount > 0 ? 'red' : 'gray',
            help: "Somme des factures dont la date d'échéance est passée et qui ne sont ni payées ni en litige.",
          })}
          {kpiCard({
            label: 'Récupéré ce mois',
            value: formatEuro(metrics.paidThisMonth),
            numeric: metrics.paidThisMonth,
            numFormat: 'euro',
            sub: `Taux de recouvrement : ${metrics.recoveryRate}%`,
            accent: 'green',
            help: "Encaissements ce mois civil. Taux = factures payées / total émis sur les 12 derniers mois.",
          })}
          {kpiCard({
            label: 'DSO moyen',
            value: metrics.dso > 0 ? `${metrics.dso}j` : '—',
            ...(metrics.dso > 0 ? { numeric: metrics.dso, numFormat: 'days' as const } : {}),
            sub: 'Délai de paiement moyen',
            accent: 'gray',
            help: "Days Sales Outstanding : nombre moyen de jours entre l'émission d'une facture et son encaissement. Objectif sain : < 30 j.",
          })}
        </div>

        {/* Pipeline strip */}
        {contacts.length > 0 && (
          <Link href="/dashboard/pipeline" className="block rounded-xl border bg-white p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Kanban className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Pipeline commercial</h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{contacts.length} contact{contacts.length > 1 ? 's' : ''}</span>
                <span className="font-semibold text-gray-800">{formatEuro(pipelineValue)} en cours</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'prospect',  label: 'Prospect',    color: 'bg-blue-500' },
                { key: 'qualified', label: 'Qualifié',    color: 'bg-violet-500' },
                { key: 'proposal',  label: 'Proposition', color: 'bg-amber-500' },
                { key: 'signed',    label: 'Signé',       color: 'bg-green-500' },
              ].map(s => (
                <div key={s.key} className="flex-1 text-center">
                  <div className={`h-1.5 w-full rounded-full ${s.color} mb-1.5 opacity-${pipelineCounts[s.key] > 0 ? '100' : '20'}`} />
                  <p className="text-lg font-bold text-gray-900">{pipelineCounts[s.key]}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
              <div className="flex-1 text-center border-l pl-2">
                <p className="text-xs text-gray-400 mb-1">Signés</p>
                <p className="text-sm font-bold text-green-600">{formatEuro(signedValue)}</p>
              </div>
            </div>
          </Link>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Invoice table — 2/3 */}
          <div className="lg:col-span-2 rounded-xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Factures actives</h3>
                <p className="text-xs text-gray-400 mt-0.5">Triées par urgence décroissante</p>
              </div>
              <Link
                href="/dashboard/invoices"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Voir tout
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y">
              {recentInvoices.map((inv) => {
                const days = getDaysOverdue(inv)
                const isOverdue = days > 0 && inv.status !== 'paid' && inv.status !== 'disputed'
                return (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Status dot */}
                    <div
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        inv.status === 'paid'
                          ? 'bg-green-500'
                          : inv.status === 'formal_notice'
                          ? 'bg-orange-500'
                          : inv.status === 'disputed'
                          ? 'bg-red-500'
                          : isOverdue
                          ? 'bg-red-400'
                          : inv.status === 'reminded'
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                      }`}
                    />

                    {/* Client + number */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {inv.client_name}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 font-mono">{inv.invoice_number}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">Éch. {formatDate(inv.due_date)}</span>
                        {isOverdue && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span className="text-xs font-semibold text-red-500">{days}j de retard</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">{formatEuro(inv.amount)}</div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-5">
            {/* Status breakdown */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Répartition</h3>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { label: 'En attente', count: metrics.statusBreakdown.pending, color: 'bg-gray-300', bar: 'bg-gray-200' },
                  { label: 'Relancé', count: metrics.statusBreakdown.reminded, color: 'bg-yellow-400', bar: 'bg-yellow-100' },
                  { label: 'Mise en demeure', count: metrics.statusBreakdown.formal_notice, color: 'bg-orange-500', bar: 'bg-orange-100' },
                  { label: 'Payé', count: metrics.statusBreakdown.paid, color: 'bg-green-500', bar: 'bg-green-100' },
                  { label: 'Litigieux', count: metrics.statusBreakdown.disputed, color: 'bg-red-500', bar: 'bg-red-100' },
                ].map((item) => {
                  const pct = invoices.length > 0 ? Math.round((item.count / invoices.length) * 100) : 0
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="text-xs text-gray-600">{item.label}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">{item.count}</span>
                      </div>
                      <div className={`h-1 rounded-full ${item.bar}`}>
                        <div
                          className={`h-1 rounded-full ${item.color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aging buckets */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Balance âgée</h3>
                <p className="text-xs text-gray-400 mt-0.5">Créances par ancienneté</p>
              </div>
              <div className="divide-y">
                {metrics.agingBuckets.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{bucket.label}</p>
                      <p className="text-xs text-gray-400">{bucket.count} facture{bucket.count !== 1 ? 's' : ''}</p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        bucket.label === 'À échoir'
                          ? 'text-gray-600'
                          : bucket.amount > 0
                          ? 'text-red-600'
                          : 'text-gray-300'
                      }`}
                    >
                      {bucket.amount > 0 ? formatEuro(bucket.amount) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Actions rapides</h3>
              </div>
              <div className="divide-y">
                {[
                  { label: 'Pipeline commercial', sub: 'Voir vos deals en cours', icon: Kanban, href: '/dashboard/pipeline' },
                  { label: 'Envoyer des relances', sub: 'Lancer une relance manuelle', icon: Send, href: '/dashboard/invoices' },
                  { label: 'Mise en demeure', sub: 'Générer un document légal', icon: FileText, href: '/dashboard/mise-en-demeure' },
                  { label: 'Scénarios', sub: 'Configurer les automatisations', icon: Bell, href: '/dashboard/scenarios' },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Icon className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">{action.label}</p>
                        <p className="text-xs text-gray-400">{action.sub}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
