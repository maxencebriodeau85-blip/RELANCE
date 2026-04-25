import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/invoices/status-badge'
import { calculateDashboardMetrics, formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Upload,
  ArrowRight,
} from 'lucide-react'
import type { Invoice } from '@/lib/database.types'

// Mock data for when Supabase isn't connected
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
  let invoices: Invoice[] = MOCK_INVOICES

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        invoices = data as Invoice[]
      }
    }
  } catch {
    // Use mock data
  }

  const metrics = calculateDashboardMetrics(invoices)
  const recentInvoices = invoices.slice(0, 5)

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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Créances totales
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {formatEuro(metrics.totalReceivables)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-sm text-blue-600">
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
          {/* Status breakdown */}
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

          {/* Recent invoices */}
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
      </div>
    </div>
  )
}
