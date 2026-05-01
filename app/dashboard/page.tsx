import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/invoices/status-badge'
import { calculateDashboardMetrics, formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import Link from 'next/link'
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Upload,
  ArrowRight,
  Zap,
  Mail,
  BarChart3,
  ShieldCheck,
  Bell,
  Euro,
  FileText,
} from 'lucide-react'
import type { Invoice } from '@/lib/database.types'

const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    user_id: 'user1',
    client_name: 'Acme Corp SARL',
    client_email: 'compta@acme.fr',
    client_address: '15 rue de la Paix, 75001 Paris',
    client_siren: '123456789',
    invoice_number: 'FA-2024-001',
    amount: 4500,
    due_date: '2024-01-15',
    issued_date: '2023-12-15',
    status: 'reminded',
    notes: null,
    created_at: '2023-12-15T10:00:00Z',
    updated_at: '2024-01-22T10:00:00Z',
  },
  {
    id: '2',
    user_id: 'user1',
    client_name: 'TechStart SAS',
    client_email: 'finance@techstart.fr',
    client_address: '8 avenue des Entrepreneurs, 69003 Lyon',
    client_siren: '987654321',
    invoice_number: 'FA-2024-002',
    amount: 12800,
    due_date: '2024-01-30',
    issued_date: '2023-12-30',
    status: 'formal_notice',
    notes: null,
    created_at: '2023-12-30T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
  },
  {
    id: '3',
    user_id: 'user1',
    client_name: 'Dupont & Fils',
    client_email: 'dupont@dupont-fils.com',
    client_address: '22 rue du Commerce, 33000 Bordeaux',
    client_siren: '456789123',
    invoice_number: 'FA-2024-003',
    amount: 2300,
    due_date: '2024-02-28',
    issued_date: '2024-01-28',
    status: 'paid',
    notes: null,
    created_at: '2024-01-28T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
  {
    id: '4',
    user_id: 'user1',
    client_name: 'Martin Solutions',
    client_email: 'contact@martin-solutions.fr',
    client_address: '5 boulevard Haussmann, 75009 Paris',
    client_siren: null,
    invoice_number: 'FA-2024-004',
    amount: 6750,
    due_date: '2024-03-15',
    issued_date: '2024-02-15',
    status: 'pending',
    notes: null,
    created_at: '2024-02-15T10:00:00Z',
    updated_at: '2024-02-15T10:00:00Z',
  },
  {
    id: '5',
    user_id: 'user1',
    client_name: 'Innovatech',
    client_email: 'billing@innovatech.io',
    client_address: '3 impasse du Digital, 31000 Toulouse',
    client_siren: '321654987',
    invoice_number: 'FA-2024-005',
    amount: 9200,
    due_date: '2024-02-01',
    issued_date: '2024-01-01',
    status: 'disputed',
    notes: 'Client conteste la prestation du 15/01',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-02-10T10:00:00Z',
  },
]

export default async function DashboardPage() {
  let invoices: Invoice[] = []
  let isLoggedIn = false
  let companyName: string | null = null
  let usingDemo = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      isLoggedIn = true

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single()
      companyName = (profileData as { company_name: string | null } | null)?.company_name ?? null

      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) invoices = data as Invoice[]
    } else {
      invoices = MOCK_INVOICES
      usingDemo = true
    }
  } catch {
    invoices = MOCK_INVOICES
    usingDemo = true
  }

  const isFirstVisit = isLoggedIn && invoices.length === 0
  const metrics = calculateDashboardMetrics(invoices)
  const recentInvoices = invoices.slice(0, 5)

  const urgentInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid' || inv.status === 'disputed') return false
    const days = getDaysOverdue(inv)
    return days > 0
  }).slice(0, 3)

  // ─── FIRST VISIT ───────────────────────────────────────────────────────────
  if (isFirstVisit) {
    return (
      <div>
        <Header
          title={`Bienvenue${companyName ? `, ${companyName}` : ''} !`}
          description="Votre outil de recouvrement est prêt — configurez-le en 3 minutes"
        />

        <div className="p-6 space-y-8">
          {/* Value props banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Euro,
                value: '+34%',
                label: 'de créances recouvrées',
                sub: 'vs relances manuelles',
                color: 'text-green-600',
                bg: 'bg-green-50',
                border: 'border-green-100',
              },
              {
                icon: Clock,
                value: '3h',
                label: 'économisées chaque semaine',
                sub: 'relances 100% automatiques',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100',
              },
              {
                icon: ShieldCheck,
                value: '0',
                label: 'relance manquée',
                sub: 'même pendant vos congés',
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-100',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={`rounded-xl border ${item.border} ${item.bg} p-5 flex items-start gap-4`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-sm font-medium text-gray-800">{item.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Preview of what the dashboard will look like */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Aperçu de votre futur tableau de bord
              </h2>
              <span className="text-xs text-gray-400 italic">Données d&apos;exemple</span>
            </div>
            <div className="relative rounded-xl border-2 border-dashed border-blue-200 overflow-hidden">
              {/* Overlay CTA */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px]">
                <div className="text-center max-w-xs">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 mx-auto mb-3 shadow-lg">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-base font-semibold text-gray-900 mb-1">
                    Activez votre tableau de bord
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Importez vos premières factures pour commencer à recouvrer automatiquement
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <Link href="/dashboard/invoices/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Importer un CSV
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard/invoices/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Saisir manuellement
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Blurred demo content */}
              <div className="p-5 space-y-4 select-none pointer-events-none opacity-40 blur-[2px]">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Créances totales', value: '35 550 €', color: 'text-gray-900' },
                    { label: 'En retard', value: '18 000 €', color: 'text-red-600' },
                    { label: 'DSO moyen', value: '42j', color: 'text-gray-900' },
                    { label: 'Taux recouvrement', value: '78%', color: 'text-green-600' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border bg-white p-3">
                      <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                      <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-lg border bg-white p-3">
                    <div className="text-xs font-medium text-gray-400 mb-3">Factures récentes</div>
                    {[
                      { name: 'Acme Corp SARL', num: 'FA-2024-001', amount: '4 500 €', status: 'Relancé' },
                      { name: 'TechStart SAS', num: 'FA-2024-002', amount: '12 800 €', status: 'Mise en demeure' },
                      { name: 'Dupont & Fils', num: 'FA-2024-003', amount: '2 300 €', status: 'Payé' },
                    ].map((row) => (
                      <div key={row.num} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs">
                        <span className="font-medium text-gray-700">{row.name}</span>
                        <span className="text-gray-400">{row.num}</span>
                        <span className="font-semibold">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-xs font-medium text-gray-400 mb-3">Par statut</div>
                    {[
                      { label: 'En attente', n: 3, color: 'bg-gray-300' },
                      { label: 'Relancé', n: 5, color: 'bg-yellow-400' },
                      { label: 'Mise en demeure', n: 2, color: 'bg-orange-400' },
                      { label: 'Payé', n: 8, color: 'bg-green-400' },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${s.color}`} />
                          <span className="text-gray-500">{s.label}</span>
                        </div>
                        <span className="font-medium">{s.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Comment ça fonctionne</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: 1,
                  icon: Upload,
                  title: 'Importez vos factures',
                  desc: 'Depuis votre logiciel de facturation via CSV, ou saisie manuelle. Compatible Sage, QuickBooks, FreshBooks.',
                  href: '/dashboard/invoices/import',
                  cta: 'Importer',
                  color: 'blue',
                },
                {
                  step: 2,
                  icon: Bell,
                  title: 'Choisissez un scénario',
                  desc: '3 scénarios préconfigurés : Cordial, Ferme, Pré-contentieux. Chaque étape se déclenche automatiquement.',
                  href: '/dashboard/scenarios',
                  cta: 'Voir les scénarios',
                  color: 'indigo',
                },
                {
                  step: 3,
                  icon: Mail,
                  title: 'RelanceFlow s\'occupe du reste',
                  desc: 'Emails personnalisés envoyés automatiquement. Suivi en temps réel. Mise en demeure en 1 clic si besoin.',
                  href: '/dashboard/mise-en-demeure',
                  cta: 'Découvrir',
                  color: 'green',
                },
              ].map((item) => {
                const Icon = item.icon
                const colors = {
                  blue: { bg: 'bg-blue-100', text: 'text-blue-700', step: 'bg-blue-600', btn: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
                  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', step: 'bg-indigo-600', btn: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50' },
                  green: { bg: 'bg-green-100', text: 'text-green-700', step: 'bg-green-600', btn: 'border-green-200 text-green-700 hover:bg-green-50' },
                }
                const c = colors[item.color as keyof typeof colors]
                return (
                  <div key={item.step} className="rounded-xl border bg-white p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}>
                        <Icon className={`h-5 w-5 ${c.text}`} />
                      </div>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${c.step} text-white text-xs font-bold`}>
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <Link
                      href={item.href}
                      className={`mt-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${c.btn}`}
                    >
                      {item.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick links footer */}
          <div className="rounded-xl border bg-gray-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <BarChart3 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Une question ?</p>
                <p className="text-xs text-gray-500">Notre documentation et support sont là pour vous aider à démarrer</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link href="/support">Aide & FAQ</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard/invoices/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Ma première facture
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── DEMO / NOT LOGGED IN ──────────────────────────────────────────────────
  if (usingDemo) {
    return (
      <div>
        <Header
          title="Tableau de bord"
          description="Vue d'ensemble de votre recouvrement"
        />
        <div className="p-6 space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex items-center justify-between gap-4">
            <span>
              <strong>Mode démo</strong> — connectez-vous pour gérer vos vraies factures
            </span>
            <Button size="sm" asChild>
              <Link href="/auth/register">Créer un compte</Link>
            </Button>
          </div>
          <DashboardContent invoices={invoices} metrics={metrics} recentInvoices={recentInvoices} urgentInvoices={urgentInvoices} />
        </div>
      </div>
    )
  }

  // ─── REGULAR DASHBOARD ─────────────────────────────────────────────────────
  return (
    <div>
      <Header
        title="Tableau de bord"
        description="Vue d'ensemble de votre recouvrement"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/invoices/import">
                <Upload className="mr-2 h-4 w-4" />
                Importer CSV
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle facture
              </Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <DashboardContent invoices={invoices} metrics={metrics} recentInvoices={recentInvoices} urgentInvoices={urgentInvoices} />
      </div>
    </div>
  )
}

// ─── SHARED DASHBOARD CONTENT ─────────────────────────────────────────────────
function DashboardContent({
  invoices,
  metrics,
  recentInvoices,
  urgentInvoices,
}: {
  invoices: Invoice[]
  metrics: ReturnType<typeof calculateDashboardMetrics>
  recentInvoices: Invoice[]
  urgentInvoices: Invoice[]
}) {
  return (
    <>
      {/* Urgent attention needed */}
      {urgentInvoices.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-red-900">
              {urgentInvoices.length} facture{urgentInvoices.length > 1 ? 's' : ''} nécessite{urgentInvoices.length > 1 ? 'nt' : ''} une action immédiate
            </h3>
          </div>
          <div className="space-y-2">
            {urgentInvoices.map((inv) => {
              const days = getDaysOverdue(inv)
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-lg bg-white border border-red-100 px-4 py-2.5 hover:border-red-300 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{inv.client_name}</div>
                      <div className="text-xs text-red-500">{days}j de retard · {inv.invoice_number}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-sm font-bold text-gray-900">{formatEuro(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-red-500 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
          {urgentInvoices.length < invoices.filter(i => getDaysOverdue(i) > 0 && i.status !== 'paid' && i.status !== 'disputed').length && (
            <div className="mt-2 text-right">
              <Link href="/dashboard/invoices" className="text-xs text-red-600 hover:underline font-medium">
                Voir toutes les factures en retard →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-blue-200">
              Créances totales
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-white">
              {formatEuro(metrics.totalReceivables)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-blue-200">
              <TrendingUp className="h-3 w-3" />
              <span>{metrics.invoiceCount} facture(s) active(s)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-gray-500">
              En retard
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-red-600">
              {formatEuro(metrics.totalOverdue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-red-500">
              <AlertTriangle className="h-3 w-3" />
              <span>{metrics.overdueCount} facture(s) en retard</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-gray-500">
              DSO (jours)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {metrics.dso}j
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Délai moyen de paiement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Taux de recouvrement
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-green-600">
              {metrics.recoveryRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>{formatEuro(metrics.paidThisMonth)} ce mois</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Buckets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Balance âgée des créances</CardTitle>
          <CardDescription>Répartition des impayés par ancienneté</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {metrics.agingBuckets.map((bucket) => (
              <div
                key={bucket.label}
                className="rounded-lg border bg-gray-50 p-3 text-center"
              >
                <div className="text-xs text-gray-500 mb-1">{bucket.label}</div>
                <div className="font-semibold text-gray-900">
                  {formatEuro(bucket.amount)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {bucket.count} facture{bucket.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status breakdown + Recent invoices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'En attente', count: metrics.statusBreakdown.pending, color: 'bg-gray-300' },
              { label: 'Relancé', count: metrics.statusBreakdown.reminded, color: 'bg-yellow-400' },
              { label: 'Mise en demeure', count: metrics.statusBreakdown.formal_notice, color: 'bg-orange-400' },
              { label: 'Payé', count: metrics.statusBreakdown.paid, color: 'bg-green-400' },
              { label: 'Litigieux', count: metrics.statusBreakdown.disputed, color: 'bg-red-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Factures récentes</CardTitle>
                <CardDescription>Les 5 dernières factures</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/invoices">
                  Voir tout
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice)
                  return (
                    <Link
                      key={invoice.id}
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {invoice.client_name}
                          </span>
                          <StatusBadge status={invoice.status} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {invoice.invoice_number} · Éch. {formatDate(invoice.due_date)}
                          {daysOverdue > 0 && (
                            <span className="text-red-500 ml-1">· {daysOverdue}j de retard</span>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold text-sm text-gray-900 ml-4 flex-shrink-0">
                        {formatEuro(invoice.amount)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
