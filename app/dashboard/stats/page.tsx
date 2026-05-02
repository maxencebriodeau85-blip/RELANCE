import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateDashboardMetrics, formatEuro, getDaysOverdue } from '@/lib/metrics'
import { CollectionsChart, AgingBarChart } from '@/components/dashboard/charts'
import type { Invoice } from '@/lib/database.types'
import { TrendingUp, TrendingDown, Clock, Target, BarChart3, Award } from 'lucide-react'

function buildMonthlyData(invoices: Invoice[], months = 12) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const paid = invoices.filter((inv) => inv.status === 'paid' && new Date(inv.updated_at) >= start && new Date(inv.updated_at) <= end)
    const overdue = invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'disputed' && new Date(inv.due_date) >= start && new Date(inv.due_date) <= end)
    return {
      month: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      collected: Math.round(paid.reduce((s, inv) => s + inv.amount, 0)),
      overdue: Math.round(overdue.reduce((s, inv) => s + inv.amount, 0)),
      paidCount: paid.length,
    }
  })
}

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub: string
  icon: any; color: string; trend?: { up: boolean; label: string }
}) {
  return (
    <div className="rounded-xl border bg-white px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-1 ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
            {trend.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

export default async function StatsPage() {
  let invoices: Invoice[] = []

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')
    const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id)
    invoices = (data as Invoice[]) ?? []
  } catch {
    redirect('/auth/login')
  }

  const metrics = calculateDashboardMetrics(invoices)
  const monthly12 = buildMonthlyData(invoices, 12)
  const monthly6 = monthly12.slice(-6)
  const agingData = metrics.agingBuckets.map((b) => ({ label: b.label, amount: b.amount, count: b.count }))

  // Computed stats
  const totalCollectedAllTime = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const avgInvoiceAmount = invoices.length > 0 ? invoices.reduce((s, i) => s + i.amount, 0) / invoices.length : 0
  const overdueAmount = invoices.filter(i => getDaysOverdue(i) > 0 && i.status !== 'paid' && i.status !== 'disputed').reduce((s, i) => s + i.amount, 0)
  const collectedThisMonth = monthly12[monthly12.length - 1]?.collected ?? 0
  const collectedLastMonth = monthly12[monthly12.length - 2]?.collected ?? 0
  const monthTrend = collectedLastMonth > 0
    ? `${Math.round(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100)}% vs mois dernier`
    : undefined

  // Top debtors (unpaid)
  const topDebtors = [...invoices]
    .filter((i) => i.status !== 'paid' && i.status !== 'disputed')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Best recovered (paid, largest)
  const topRecovered = [...invoices]
    .filter((i) => i.status === 'paid')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-sm text-gray-400 mt-0.5">Vue d'ensemble de votre activité de recouvrement</p>
      </div>

      <div className="p-6 space-y-6 max-w-7xl">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Récupéré ce mois"
            value={formatEuro(collectedThisMonth)}
            sub={monthTrend ?? 'Encaissements du mois en cours'}
            icon={TrendingUp}
            color="bg-green-100 text-green-600"
            trend={collectedLastMonth > 0 ? { up: collectedThisMonth >= collectedLastMonth, label: monthTrend! } : undefined}
          />
          <StatCard
            label="Total récupéré"
            value={formatEuro(totalCollectedAllTime)}
            sub={`Sur ${invoices.filter(i => i.status === 'paid').length} factures payées`}
            icon={Award}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="DSO moyen"
            value={metrics.dso > 0 ? `${metrics.dso} jours` : '—'}
            sub="Délai moyen de paiement"
            icon={Clock}
            color={metrics.dso > 60 ? 'bg-red-100 text-red-600' : metrics.dso > 30 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}
            trend={metrics.dso > 0 ? { up: metrics.dso <= 45, label: metrics.dso <= 45 ? 'Bon niveau' : 'À améliorer' } : undefined}
          />
          <StatCard
            label="Taux de recouvrement"
            value={`${metrics.recoveryRate}%`}
            sub="Factures impayées récupérées"
            icon={Target}
            color="bg-purple-100 text-purple-600"
            trend={metrics.recoveryRate > 0 ? { up: metrics.recoveryRate >= 70, label: metrics.recoveryRate >= 70 ? 'Excellent' : 'À optimiser' } : undefined}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Encaissements — 12 derniers mois</h3>
              <p className="text-xs text-gray-400 mt-0.5">Montants mensuels récupérés</p>
            </div>
            <div className="px-5 py-4">
              <CollectionsChart data={monthly12} />
            </div>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Balance âgée</h3>
              <p className="text-xs text-gray-400 mt-0.5">Créances actives par ancienneté</p>
            </div>
            <div className="px-4 pt-4">
              <AgingBarChart data={agingData} />
            </div>
            <div className="divide-y border-t mt-2">
              {metrics.agingBuckets.map((b) => (
                <div key={b.label} className="flex items-center justify-between px-5 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{b.label}</p>
                    <p className="text-xs text-gray-400">{b.count} facture{b.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`text-xs font-bold ${b.amount > 0 && b.label !== 'À échoir' ? 'text-red-600' : 'text-gray-500'}`}>
                    {b.amount > 0 ? formatEuro(b.amount) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'En attente', count: metrics.statusBreakdown.pending, amount: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0), color: 'bg-gray-100 text-gray-600 border-gray-200' },
            { label: 'Relancé', count: metrics.statusBreakdown.reminded, amount: invoices.filter(i => i.status === 'reminded').reduce((s, i) => s + i.amount, 0), color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { label: 'Mise en demeure', count: metrics.statusBreakdown.formal_notice, amount: invoices.filter(i => i.status === 'formal_notice').reduce((s, i) => s + i.amount, 0), color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Payé', count: metrics.statusBreakdown.paid, amount: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0), color: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Litigieux', count: metrics.statusBreakdown.disputed, amount: invoices.filter(i => i.status === 'disputed').reduce((s, i) => s + i.amount, 0), color: 'bg-red-50 text-red-700 border-red-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
              <p className="text-xs font-semibold opacity-70">{s.label}</p>
              <p className="text-xl font-bold mt-1">{s.count}</p>
              <p className="text-xs mt-0.5 opacity-80">{formatEuro(s.amount)}</p>
            </div>
          ))}
        </div>

        {/* Top tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top debtors */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Principaux débiteurs</h3>
              <p className="text-xs text-gray-400 mt-0.5">Factures actives les plus importantes</p>
            </div>
            {topDebtors.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Aucune facture impayée 🎉</div>
            ) : (
              <div className="divide-y">
                {topDebtors.map((inv, idx) => (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inv.client_name}</p>
                      <p className="text-xs text-gray-400">{inv.invoice_number} · {getDaysOverdue(inv)}j de retard</p>
                    </div>
                    <span className="text-sm font-bold text-red-600 flex-shrink-0">{formatEuro(inv.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last recovered */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Dernières créances récupérées</h3>
              <p className="text-xs text-gray-400 mt-0.5">Factures récemment payées</p>
            </div>
            {topRecovered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Aucune facture payée encore</div>
            ) : (
              <div className="divide-y">
                {topRecovered.map((inv, idx) => (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inv.client_name}</p>
                      <p className="text-xs text-gray-400">{inv.invoice_number} · Payé le {new Date(inv.updated_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 flex-shrink-0">{formatEuro(inv.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance insight */}
        <div className="rounded-xl border bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-200" />
                <h3 className="font-semibold text-sm">Performance globale</h3>
              </div>
              <p className="text-blue-100 text-sm">
                {metrics.recoveryRate >= 80
                  ? `Excellent taux de recouvrement — ${metrics.recoveryRate}% de vos créances récupérées.`
                  : metrics.recoveryRate >= 50
                  ? `Taux de recouvrement correct (${metrics.recoveryRate}%). Activez les relances automatiques pour l'améliorer.`
                  : `Taux de recouvrement de ${metrics.recoveryRate}%. Configurez un scénario de relances automatiques pour récupérer davantage.`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold">{metrics.recoveryRate}%</p>
              <p className="text-blue-200 text-xs">taux de recouvrement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
