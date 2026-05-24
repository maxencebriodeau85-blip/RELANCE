import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatEuro } from '@/lib/metrics'
import {
  TrendingUp, FileText, Users, Phone,
  Mail, MessageSquare, Calendar, ChevronRight,
  Award, Target,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

function getLast6Months() {
  const result = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      labelFull: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    })
  }
  return result
}

function inMonth(dateStr: string, m: { year: number; month: number }) {
  const d = new Date(dateStr)
  return d.getFullYear() === m.year && d.getMonth() === m.month
}

interface BarProps { label: string; value: number; max: number; color: string; sub?: string }

function Bar({ label, value, max, color, sub }: BarProps) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-xs font-semibold text-gray-700 tabular-nums">
        {value > 0 ? formatEuro(value) : ''}
      </span>
      <div className="w-full flex items-end" style={{ height: 100 }}>
        <div
          className={`w-full rounded-t-lg ${color} transition-all`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
      {sub && <span className="text-xs text-gray-300">{sub}</span>}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [invoicesRes, contactsRes, journalRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('user_id', user.id),
    supabase.from('contacts').select('id, name, pipeline_stage, deal_amount, created_at').eq('user_id', user.id),
    supabase.from('journal_entries').select('type, occurred_at').eq('user_id', user.id),
  ])

  const invoices = (invoicesRes.data || []) as {
    id: string; client_name: string; amount: number; status: string
    issued_date: string; due_date: string; updated_at: string
  }[]
  const contacts = (contactsRes.data || []) as {
    id: string; name: string; pipeline_stage: string; deal_amount: number | null; created_at: string
  }[]
  const journal = (journalRes.data || []) as { type: string; occurred_at: string }[]

  // ── Monthly revenue (last 6 months)
  const months = getLast6Months()
  const revenueData = months.map(m => ({
    label: m.label,
    issued: invoices.filter(inv => inMonth(inv.issued_date, m)).reduce((s, i) => s + i.amount, 0),
    collected: invoices.filter(inv => inv.status === 'paid' && inMonth(inv.updated_at, m)).reduce((s, i) => s + i.amount, 0),
  }))
  const maxRev = Math.max(...revenueData.map(d => Math.max(d.issued, d.collected)), 1)

  // ── Pipeline funnel
  const funnelStages = ['prospect', 'qualified', 'proposal', 'signed'] as const
  const funnelLabels: Record<string, string> = {
    prospect: 'Prospect', qualified: 'Qualifié', proposal: 'Proposition', signed: 'Signé'
  }
  const funnelColors: Record<string, string> = {
    prospect: 'bg-blue-400', qualified: 'bg-violet-400', proposal: 'bg-amber-400', signed: 'bg-green-500'
  }
  const funnelData = funnelStages.map(s => ({
    stage: s,
    label: funnelLabels[s],
    count: contacts.filter(c => c.pipeline_stage === s).length,
    value: contacts.filter(c => c.pipeline_stage === s).reduce((sum, c) => sum + (c.deal_amount || 0), 0),
    color: funnelColors[s],
  }))
  const maxFunnelCount = Math.max(...funnelData.map(d => d.count), 1)

  // ── Top clients (by total invoiced)
  const clientMap = new Map<string, { invoiced: number; paid: number; count: number; hasOverdue: boolean }>()
  const today = new Date().toISOString().split('T')[0]
  for (const inv of invoices) {
    const cur = clientMap.get(inv.client_name) || { invoiced: 0, paid: 0, count: 0, hasOverdue: false }
    const isOverdue = inv.status !== 'paid' && inv.status !== 'disputed' && inv.due_date < today
    clientMap.set(inv.client_name, {
      invoiced: cur.invoiced + inv.amount,
      paid: cur.paid + (inv.status === 'paid' ? inv.amount : 0),
      count: cur.count + 1,
      hasOverdue: cur.hasOverdue || isOverdue,
    })
  }
  const topClients = Array.from(clientMap.entries())
    .sort((a, b) => b[1].invoiced - a[1].invoiced)
    .slice(0, 8)

  // ── Activity by type
  const activityTypes = [
    { key: 'call', label: 'Appels', icon: Phone, color: 'text-blue-600 bg-blue-50' },
    { key: 'email', label: 'Emails', icon: Mail, color: 'text-violet-600 bg-violet-50' },
    { key: 'note', label: 'Notes', icon: MessageSquare, color: 'text-gray-600 bg-gray-100' },
    { key: 'meeting', label: 'Réunions', icon: Calendar, color: 'text-amber-600 bg-amber-50' },
  ]
  const activityCount = activityTypes.map(t => ({
    ...t,
    count: journal.filter(j => j.type === t.key).length,
  }))

  // ── Global KPIs
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0)
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const recoveryRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0
  const activeDeals = contacts.filter(c => !['lost', 'signed'].includes(c.pipeline_stage)).length
  const pipelineValue = contacts.filter(c => c.pipeline_stage !== 'lost').reduce((s, c) => s + (c.deal_amount || 0), 0)
  const winRate = contacts.length > 0
    ? Math.round((contacts.filter(c => c.pipeline_stage === 'signed').length / contacts.filter(c => ['signed', 'lost'].includes(c.pipeline_stage)).length || 0) * 100)
    : 0
  const avgDealSize = contacts.filter(c => c.deal_amount).length > 0
    ? Math.round(contacts.filter(c => c.deal_amount).reduce((s, c) => s + (c.deal_amount || 0), 0) / contacts.filter(c => c.deal_amount).length)
    : 0

  const kpis = [
    { label: 'Encaissé total', value: formatEuro(totalCollected), sub: `sur ${formatEuro(totalInvoiced)} facturés`, color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: TrendingUp },
    { label: 'Taux de recouvrement', value: `${recoveryRate}%`, sub: recoveryRate >= 80 ? 'Excellent' : recoveryRate >= 60 ? 'Correct' : 'À améliorer', color: recoveryRate >= 70 ? 'text-green-600' : 'text-amber-600', bg: recoveryRate >= 70 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100', icon: Target },
    { label: 'Pipeline actif', value: formatEuro(pipelineValue), sub: `${activeDeals} deal${activeDeals > 1 ? 's' : ''} en cours`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Users },
    { label: 'Taux de closing', value: winRate > 0 ? `${winRate}%` : '—', sub: avgDealSize > 0 ? `Taille moy. ${formatEuro(avgDealSize)}` : 'Données insuffisantes', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100', icon: Award },
  ]

  const hasData = invoices.length > 0 || contacts.length > 0

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-sm text-gray-400 mt-0.5">Analyse complète de votre activité commerciale</p>
      </div>

      <div className="p-6 space-y-5 max-w-6xl">
        {!hasData ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <TrendingUp className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune donnée à analyser</h2>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              Ajoutez des factures et des contacts pour voir vos statistiques s&apos;animer.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard/pipeline" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                Ajouter des contacts
              </Link>
              <Link href="/dashboard/invoices/new" className="rounded-lg border border-gray-200 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors">
                Créer une facture
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map(k => {
                const Icon = k.icon
                return (
                  <div key={k.label} className={`rounded-xl border ${k.bg} px-5 py-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                      <Icon className={`h-4 w-4 ${k.color}`} />
                    </div>
                    <p className={`text-2xl font-bold leading-none ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-gray-500 mt-2">{k.sub}</p>
                  </div>
                )
              })}
            </div>

            {/* Revenue chart + Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Revenue chart (3/5) */}
              <div className="lg:col-span-3 rounded-xl border bg-white p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Facturation & encaissements</h3>
                    <p className="text-xs text-gray-400 mt-0.5">6 derniers mois</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-200 inline-block" />Facturé</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500 inline-block" />Encaissé</span>
                  </div>
                </div>
                <div className="flex items-end gap-2" style={{ height: 130 }}>
                  {revenueData.map((d, i) => {
                    const issuedH = maxRev > 0 ? (d.issued / maxRev) * 100 : 0
                    const collH = maxRev > 0 ? (d.collected / maxRev) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0">
                        <div className="w-full flex items-end gap-0.5" style={{ height: 110 }}>
                          <div
                            className="flex-1 rounded-t-sm bg-blue-100 transition-all"
                            style={{ height: `${Math.max(issuedH, d.issued > 0 ? 3 : 0)}%` }}
                          />
                          <div
                            className="flex-1 rounded-t-sm bg-green-500 transition-all"
                            style={{ height: `${Math.max(collH, d.collected > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 mt-2">{d.label}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Totals */}
                <div className="mt-4 pt-4 border-t flex justify-between text-xs text-gray-500">
                  <span>Total facturé : <span className="font-semibold text-gray-800">{formatEuro(revenueData.reduce((s, d) => s + d.issued, 0))}</span></span>
                  <span>Total encaissé : <span className="font-semibold text-green-700">{formatEuro(revenueData.reduce((s, d) => s + d.collected, 0))}</span></span>
                </div>
              </div>

              {/* Pipeline funnel (2/5) */}
              <div className="lg:col-span-2 rounded-xl border bg-white p-5">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-900">Entonnoir pipeline</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{contacts.length} contact{contacts.length > 1 ? 's' : ''} au total</p>
                </div>
                <div className="space-y-3">
                  {funnelData.map((stage, i) => {
                    const pct = maxFunnelCount > 0 ? (stage.count / maxFunnelCount) * 100 : 0
                    const convRate = i > 0 && funnelData[i - 1].count > 0
                      ? Math.round((stage.count / funnelData[i - 1].count) * 100)
                      : null
                    return (
                      <div key={stage.stage}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{stage.label}</span>
                          <div className="flex items-center gap-2">
                            {convRate !== null && (
                              <span className="text-xs text-gray-400">→ {convRate}%</span>
                            )}
                            <span className="text-xs font-bold text-gray-900">{stage.count}</span>
                          </div>
                        </div>
                        <div className="h-6 w-full rounded-lg bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full ${stage.color} rounded-lg transition-all flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(pct, stage.count > 0 ? 8 : 0)}%` }}
                          >
                            {stage.value > 0 && (
                              <span className="text-xs text-white font-medium truncate">
                                {formatEuro(stage.value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {winRate > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Taux de closing</span>
                      <span className="text-sm font-bold text-green-600">{winRate}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top clients + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Top clients (3/5) */}
              <div className="lg:col-span-3 rounded-xl border bg-white overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Top clients</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Par montant total facturé</p>
                  </div>
                  <Link href="/dashboard/invoices" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Voir factures <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                {topClients.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    Aucune facture enregistrée
                  </div>
                ) : (
                  <div className="divide-y">
                    {topClients.map(([name, data], i) => {
                      const collRate = data.invoiced > 0 ? Math.round((data.paid / data.invoiced) * 100) : 0
                      const maxAmount = topClients[0][1].invoiced
                      const barPct = maxAmount > 0 ? (data.invoiced / maxAmount) * 100 : 0
                      return (
                        <div key={name} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                              <span className="text-sm font-medium text-gray-900">{name}</span>
                              <span className="text-xs text-gray-400">{data.count} fact.</span>
                              {data.hasOverdue && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                                  En retard
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900">{formatEuro(data.invoiced)}</span>
                              <span className={`ml-2 text-xs font-medium ${collRate >= 100 ? 'text-green-600' : collRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                {collRate}% encaissé
                              </span>
                            </div>
                          </div>
                          <div className="flex h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="bg-green-500 rounded-full" style={{ width: `${collRate}%` }} />
                            <div className="bg-blue-200 rounded-full flex-1" style={{ maxWidth: `${100 - collRate}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Activity + Invoice status (2/5) */}
              <div className="lg:col-span-2 space-y-5">
                {/* Activity breakdown */}
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Activité CRM</h3>
                  <div className="space-y-2.5">
                    {activityCount.map(a => {
                      const Icon = a.icon
                      const maxAct = Math.max(...activityCount.map(x => x.count), 1)
                      const pct = (a.count / maxAct) * 100
                      return (
                        <div key={a.key} className="flex items-center gap-3">
                          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">{a.label}</span>
                              <span className="text-xs font-bold text-gray-900">{a.count}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-100">
                              <div className="h-1.5 rounded-full bg-gray-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {journal.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Aucune activité dans le journal</p>
                    )}
                  </div>
                </div>

                {/* Invoice status distribution */}
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Statut des factures</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'paid', label: 'Payées', color: 'bg-green-500', text: 'text-green-600' },
                      { key: 'pending', label: 'En attente', color: 'bg-gray-300', text: 'text-gray-500' },
                      { key: 'reminded', label: 'Relancées', color: 'bg-amber-400', text: 'text-amber-600' },
                      { key: 'formal_notice', label: 'Mise en demeure', color: 'bg-orange-500', text: 'text-orange-600' },
                      { key: 'disputed', label: 'Litige', color: 'bg-red-500', text: 'text-red-600' },
                    ].map(s => {
                      const count = invoices.filter(i => i.status === s.key).length
                      const pct = invoices.length > 0 ? Math.round((count / invoices.length) * 100) : 0
                      return (
                        <div key={s.key} className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${s.color}`} />
                          <span className="text-xs text-gray-600 flex-1">{s.label}</span>
                          <span className={`text-xs font-bold ${s.text}`}>{count}</span>
                          <span className="text-xs text-gray-300 w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
