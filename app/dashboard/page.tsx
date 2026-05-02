import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  calculateDashboardMetrics,
  formatEuro,
  formatDate,
  getDaysOverdue,
} from '@/lib/metrics'
import { StatusBadge } from '@/components/invoices/status-badge'
import { CollectionsChart, AgingBarChart } from '@/components/dashboard/charts'
import type { Invoice, Profile } from '@/lib/database.types'
import {
  AlertTriangle,
  Plus,
  Upload,
  ArrowRight,
  FileText,
  Send,
  Bell,
  ChevronRight,
  BarChart3,
  CheckCircle,
} from 'lucide-react'

function kpiCard({
  label, value, sub, accent, trend,
}: {
  label: string; value: string; sub: string
  accent: 'blue' | 'red' | 'green' | 'gray'
  trend?: { dir: 'up' | 'down' | 'neutral'; label: string }
}) {
  const accents = {
    blue:  { val: 'text-blue-700',  bg: 'bg-blue-50  border-blue-100',  dot: 'bg-blue-500'  },
    red:   { val: 'text-red-600',   bg: 'bg-red-50   border-red-100',   dot: 'bg-red-500'   },
    green: { val: 'text-green-600', bg: 'bg-green-50 border-green-100', dot: 'bg-green-500' },
    gray:  { val: 'text-gray-800',  bg: 'bg-white    border-gray-100',  dot: 'bg-gray-400'  },
  }
  const c = accents[accent]
  return (
    <div className={`rounded-xl border ${c.bg} px-5 py-4`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${c.val} leading-none`}>{value}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
          {sub}
        </p>
        {trend && (
          <span className={`text-xs font-semibold ${trend.dir === 'up' ? 'text-green-600' : trend.dir === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
            {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '•'} {trend.label}
          </span>
        )}
      </div>
    </div>
  )
}

function buildMonthlyData(invoices: Invoice[]) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      collected: 0,
      overdue: 0,
    }
  })
  for (const inv of invoices) {
    const updatedAt = new Date(inv.updated_at)
    const dueDate = new Date(inv.due_date)
    if (inv.status === 'paid') {
      const m = months.find((mo) => updatedAt >= mo.start && updatedAt <= mo.end)
      if (m) m.collected += inv.amount
    }
    if (inv.status !== 'paid' && inv.status !== 'disputed') {
      const m = months.find((mo) => dueDate >= mo.start && dueDate <= mo.end)
      if (m) m.overdue += inv.amount
    }
  }
  return months.map((m) => ({ month: m.month, collected: Math.round(m.collected), overdue: Math.round(m.overdue) }))
}

export default async function DashboardPage() {
  let invoices: Invoice[] = []
  let profile: Profile | null = null
  let recentReminders: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const [profileRes, invoicesRes, remindersRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('invoices').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      supabase.from('reminders')
        .select('*, invoices(client_name, invoice_number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    profile = (profileRes.data as Profile) ?? null
    invoices = (invoicesRes.data as Invoice[]) ?? []
    recentReminders = remindersRes.data ?? []
  } catch {
    redirect('/auth/login')
  }

  const metrics = calculateDashboardMetrics(invoices)
  const today = new Date()
  const todayLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const companyName = profile?.company_name ?? null
  const hasInvoices = invoices.length > 0

  const urgentInvoices = invoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'disputed' && getDaysOverdue(inv) > 0)
    .sort((a, b) => getDaysOverdue(b) - getDaysOverdue(a))

  const overdueTotal = urgentInvoices.reduce((s, inv) => s + inv.amount, 0)
  const monthlyData = buildMonthlyData(invoices)
  const agingData = metrics.agingBuckets.map((b) => ({ label: b.label, amount: b.amount, count: b.count }))

  // ── EMPTY STATE ────────────────────────────────────────────────────────────
  if (!hasInvoices) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="bg-white border-b px-6 py-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-400 capitalize mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/invoices/import" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />Importer CSV
            </Link>
            <Link href="/dashboard/invoices/new" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />Nouvelle facture
            </Link>
          </div>
        </div>
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white px-6 py-6">
            <p className="text-blue-200 text-sm mb-1">Bienvenue sur RelanceFlow</p>
            <h2 className="text-2xl font-bold">{companyName ? `Bonjour, ${companyName} 👋` : 'Votre espace est prêt'}</h2>
            <p className="text-blue-200 text-sm mt-2 max-w-xl">
              Importez vos factures impayées. RelanceFlow envoie automatiquement les relances au bon moment — sans que vous ayez à intervenir.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/dashboard/invoices/import" className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-700 px-4 py-2 text-sm font-semibold hover:bg-blue-50 transition-colors">
                <Upload className="h-4 w-4" />Importer un CSV
              </Link>
              <Link href="/dashboard/invoices/new" className="inline-flex items-center gap-2 rounded-lg border border-blue-400 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-600 transition-colors">
                <Plus className="h-4 w-4" />Saisir manuellement
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiCard({ label: 'Créances en cours', value: '0 €', sub: '0 facture active', accent: 'blue' })}
            {kpiCard({ label: 'Montant en retard', value: '0 €', sub: '0 en souffrance', accent: 'red' })}
            {kpiCard({ label: 'Récupéré ce mois', value: '0 €', sub: 'Taux : —', accent: 'green' })}
            {kpiCard({ label: 'DSO moyen', value: '—', sub: 'Délai moyen', accent: 'gray' })}
          </div>
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Démarrage — 3 étapes</h3>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-3 py-1">0 / 3</span>
            </div>
            <div className="divide-y">
              {[
                { n: 1, icon: Upload, title: 'Importez vos factures impayées', desc: "Glissez-déposez un CSV depuis Sage, QuickBooks, Ciel, FreshBooks.", href: '/dashboard/invoices/import', cta: 'Importer', active: true },
                { n: 2, icon: Bell, title: 'Activez les relances automatiques', desc: "J+7, J+15, J+30, J+45 — les emails partent seuls selon le retard.", href: '/dashboard/scenarios', cta: 'Configurer', active: false },
                { n: 3, icon: FileText, title: 'Complétez votre profil', desc: "Raison sociale, SIREN — apparaissent dans vos mises en demeure.", href: '/dashboard/settings', cta: 'Compléter', active: false },
              ].map((step) => {
                const Icon = step.icon
                return (
                  <Link key={step.n} href={step.href} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                    <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{step.n}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className={`text-sm font-semibold ${step.active ? 'text-blue-700' : 'text-gray-700'}`}>{step.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className={`text-xs font-medium ${step.active ? 'text-blue-600' : 'text-gray-400'}`}>{step.cta}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FULL DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b px-6 py-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-400 capitalize mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/invoices/import" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload className="h-4 w-4" />Importer CSV
          </Link>
          <Link href="/dashboard/invoices/new" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-5 max-w-7xl">
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
                  <p className="text-xs text-red-600 mt-0.5">{formatEuro(overdueTotal)} de créances en souffrance</p>
                </div>
              </div>
              <Link href="/dashboard/invoices" className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                Traiter<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCard({ label: 'Créances en cours', value: formatEuro(metrics.totalReceivables), sub: `${metrics.invoiceCount} facture${metrics.invoiceCount > 1 ? 's' : ''}`, accent: 'blue' })}
          {kpiCard({ label: 'Montant en retard', value: formatEuro(metrics.totalOverdue), sub: `${metrics.overdueCount} en souffrance`, accent: metrics.overdueCount > 0 ? 'red' : 'gray' })}
          {kpiCard({ label: 'Récupéré ce mois', value: formatEuro(metrics.paidThisMonth), sub: `Taux : ${metrics.recoveryRate}%`, accent: 'green', trend: metrics.recoveryRate > 0 ? { dir: 'up', label: `${metrics.recoveryRate}%` } : undefined })}
          {kpiCard({ label: 'DSO moyen', value: metrics.dso > 0 ? `${metrics.dso}j` : '—', sub: 'Délai moyen', accent: 'gray', trend: metrics.dso > 0 ? { dir: metrics.dso < 45 ? 'up' : 'down', label: `${metrics.dso}j` } : undefined })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Encaissements — 6 derniers mois</h3>
                <p className="text-xs text-gray-400 mt-0.5">Montants récupérés par mois</p>
              </div>
              <Link href="/dashboard/stats" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Tout voir<ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="px-5 py-4">
              <CollectionsChart data={monthlyData} />
            </div>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Balance âgée</h3>
              <p className="text-xs text-gray-400 mt-0.5">Créances par ancienneté</p>
            </div>
            <div className="px-4 pt-4">
              <AgingBarChart data={agingData} />
            </div>
            <div className="divide-y border-t mt-2">
              {metrics.agingBuckets.filter(b => b.amount > 0).map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between px-5 py-2">
                  <p className="text-xs font-medium text-gray-700">{bucket.label}</p>
                  <span className={`text-xs font-bold ${bucket.label === 'À échoir' ? 'text-gray-600' : 'text-red-600'}`}>
                    {formatEuro(bucket.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices + sidebar */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Factures urgentes</h3>
                <p className="text-xs text-gray-400 mt-0.5">Triées par retard décroissant</p>
              </div>
              <Link href="/dashboard/invoices" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Voir tout<ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y">
              {(urgentInvoices.length > 0 ? urgentInvoices : invoices).slice(0, 8).map((inv) => {
                const days = getDaysOverdue(inv)
                const isOverdue = days > 0 && inv.status !== 'paid' && inv.status !== 'disputed'
                return (
                  <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${inv.status === 'paid' ? 'bg-green-500' : inv.status === 'formal_notice' ? 'bg-orange-500' : inv.status === 'disputed' ? 'bg-red-500' : isOverdue ? 'bg-red-400' : inv.status === 'reminded' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{inv.client_name}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 font-mono">{inv.invoice_number}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">Éch. {formatDate(inv.due_date)}</span>
                        {isOverdue && <><span className="text-gray-200">·</span><span className="text-xs font-semibold text-red-500">{days}j</span></>}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900 flex-shrink-0">{formatEuro(inv.amount)}</div>
                    <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="space-y-5">
            {/* Status breakdown */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Répartition</h3>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { label: 'En attente', count: metrics.statusBreakdown.pending, color: 'bg-gray-300' },
                  { label: 'Relancé', count: metrics.statusBreakdown.reminded, color: 'bg-yellow-400' },
                  { label: 'Mise en demeure', count: metrics.statusBreakdown.formal_notice, color: 'bg-orange-500' },
                  { label: 'Payé', count: metrics.statusBreakdown.paid, color: 'bg-green-500' },
                  { label: 'Litigieux', count: metrics.statusBreakdown.disputed, color: 'bg-red-500' },
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
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div className={`h-1.5 rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Activité récente</h3>
              </div>
              <div className="divide-y">
                {recentReminders.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <Bell className="h-7 w-7 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Aucune relance envoyée</p>
                  </div>
                ) : recentReminders.map((r: any) => {
                  const typeLabels: Record<string, string> = { email_1: '1ère relance', email_2: '2ème relance', email_3: 'Pré-contentieux', formal_notice: 'Mise en demeure' }
                  return (
                    <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                      <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${r.status === 'sent' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {r.status === 'sent'
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {typeLabels[r.type] ?? r.type} — {(r.invoices as any)?.client_name ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Actions rapides</h3>
              </div>
              <div className="divide-y">
                {[
                  { label: 'Envoyer des relances', sub: 'Relances manuelles', icon: Send, href: '/dashboard/invoices' },
                  { label: 'Mise en demeure', sub: 'Document légal', icon: FileText, href: '/dashboard/mise-en-demeure' },
                  { label: 'Statistiques', sub: 'Analytics détaillées', icon: BarChart3, href: '/dashboard/stats' },
                  { label: 'Importer des factures', sub: 'Via CSV', icon: Upload, href: '/dashboard/invoices/import' },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link key={action.label} href={action.href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
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
