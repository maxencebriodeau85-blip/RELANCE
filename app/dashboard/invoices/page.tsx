'use client'

import { invoiceExportCSV } from '@/lib/invoice-export'
import { useState, useEffect, useCallback } from 'react'
import { ReminderReview } from '@/components/invoices/reminder-review'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/invoices/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { outstanding, reminderBlock } from '@/lib/collection'
import { formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import {
  Plus, Upload, Search, ChevronLeft, ChevronRight, Eye, Send,
  FileText, FilterX, Download, CheckSquare, Trash2, CheckCircle,
  X, Square,
} from 'lucide-react'
import Link from 'next/link'
import type { Invoice } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/client'
import { applyInvoiceAction } from '@/lib/invoice-actions'
import { useToast } from '@/hooks/use-toast'

const PAGE_SIZE = 10

function exportToCSV(invoices: Invoice[]) {
  const blob = new Blob([invoiceExportCSV(invoices)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `factures-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const collected: Invoice[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('invoices').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499)
        if (error) throw error
        collected.push(...((data || []) as Invoice[]))
        if (!data || data.length < 500) break
      }
      setInvoices(collected)
      setSelected(new Set())
    } catch {
      setLoadError('Impossible d’actualiser les factures. Les données affichées peuvent être anciennes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  const [quickFilter, setQuickFilter] = useState<'all' | 'overdue' | 'overdue30' | 'unpaid' | 'missing_email'>('all')

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      inv.client_name.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_email || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    const matchFrom = !dateFrom || inv.due_date >= dateFrom
    const matchTo = !dateTo || inv.due_date <= dateTo
    const od = getDaysOverdue(inv)
    let matchQuick = true
    if (quickFilter === 'overdue') matchQuick = od > 0 && inv.status !== 'paid' && inv.status !== 'disputed'
    else if (quickFilter === 'overdue30') matchQuick = od > 30 && inv.status !== 'paid' && inv.status !== 'disputed'
    else if (quickFilter === 'missing_email') matchQuick = !inv.client_email
    else if (quickFilter === 'unpaid') matchQuick = inv.status !== 'paid'
    return matchSearch && matchStatus && matchFrom && matchTo && matchQuick
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const paginated = filtered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE)

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allPageSelected = paginated.length > 0 && paginated.every((inv) => selected.has(inv.id))

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        paginated.forEach((inv) => next.delete(inv.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        paginated.forEach((inv) => next.add(inv.id))
        return next
      })
    }
  }

  const clearSelection = () => setSelected(new Set())

  const bulkMarkPaid = async () => {
    setBulkLoading(true)
    try {
      await applyInvoiceAction('paid', invoices.filter(i => selected.has(i.id)))
      await loadInvoices()
      const n = selected.size
      clearSelection()
      toast({ title: `${n} facture${n > 1 ? 's' : ''} marquée${n > 1 ? 's' : ''} payée${n > 1 ? 's' : ''}` })
    } catch (error) {
      toast({ title: 'Action interrompue', description: error instanceof Error ? error.message : 'Réessayez.', variant: 'destructive' })
    } finally {
      setBulkLoading(false)
    }
  }

  const bulkDelete = async () => {
    const n = selected.size
    if (!confirm(`Supprimer ${n} facture${n > 1 ? 's' : ''} ? Cette action est irréversible.`)) return
    setBulkLoading(true)
    try {
      await applyInvoiceAction('delete', invoices.filter(i => selected.has(i.id)))
      await loadInvoices()
      clearSelection()
      toast({ title: `${n} facture${n > 1 ? 's' : ''} supprimée${n > 1 ? 's' : ''}` })
    } catch (error) {
      toast({ title: 'Action interrompue', description: error instanceof Error ? error.message : 'Réessayez.', variant: 'destructive' })
    } finally {
      setBulkLoading(false)
    }
  }

  const totalAmount = filtered.reduce((s, inv) => s + outstanding(inv), 0)

  return (
    <div>
      {loadError && <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<Button variant="outline" className="ml-3" onClick={loadInvoices}>Réessayer</Button></div>}
      <Header
        title="Factures"
        description={`${filtered.length} facture${filtered.length !== 1 ? 's' : ''} · ${formatEuro(totalAmount)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)}>
              <Download className="mr-2 h-4 w-4" />Exporter
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/invoices/import"><Upload className="mr-2 h-4 w-4" />Importer</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/invoices/new"><Plus className="mr-2 h-4 w-4" />Ajouter au suivi</Link>
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary chips */}
        {!loading && invoices.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Reste à encaisser', value: formatEuro(invoices.reduce((s, i) => s + Math.round(outstanding(i) * 100), 0) / 100), cls: 'bg-blue-50 text-brand-700 border-blue-100' },
              { label: 'En retard', value: `${invoices.filter(i => getDaysOverdue(i) > 0 && i.status !== 'paid' && i.status !== 'disputed').length}`, cls: 'bg-red-50 text-red-700 border-red-100' },
              { label: 'Payées', value: `${invoices.filter(i => i.status === 'paid').length}`, cls: 'bg-green-50 text-green-700 border-green-100' },
            ].map((chip) => (
              <div key={chip.label} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${chip.cls}`}>
                <span className="opacity-70 font-normal">{chip.label}</span>
                <span>{chip.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick filter chips */}
        {!loading && invoices.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Toutes', count: invoices.length },
              { id: 'missing_email', label: 'Sans email', count: invoices.filter(i => !i.client_email).length },
              { id: 'unpaid', label: 'Non payées', count: invoices.filter(i => i.status !== 'paid').length },
              { id: 'overdue', label: 'En retard', count: invoices.filter(i => getDaysOverdue(i) > 0 && i.status !== 'paid' && i.status !== 'disputed').length },
              { id: 'overdue30', label: '> 30 jours', count: invoices.filter(i => getDaysOverdue(i) > 30 && i.status !== 'paid' && i.status !== 'disputed').length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => { setQuickFilter(f.id as typeof quickFilter); setPage(1) }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  quickFilter === f.id
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {f.label}
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                  quickFilter === f.id ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Client, n° facture, email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="reminded">Relancé</SelectItem>
              <SelectItem value="formal_notice">Mise en demeure</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="disputed">Litigieux</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-36 text-xs"
              aria-label="Échéance depuis"
            />
            <span className="text-gray-400 text-sm">→</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-36 text-xs"
              aria-label="Échéance jusqu'au"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Réinitialiser les dates"
              >
                <FilterX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
            <span className="text-sm font-semibold text-blue-900">
              {selected.size} sélectionnée{selected.size > 1 ? 's' : ''}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={bulkMarkPaid} disabled={bulkLoading} className="h-7 text-xs">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-600" />Marquer payé
              </Button>
              <ReminderReview ids={invoices.filter(i => selected.has(i.id) && !reminderBlock(i)).map(i => i.id)} disabled={bulkLoading} onSent={loadInvoices} label="Vérifier les relances" />
              <Button size="sm" variant="outline" onClick={() => exportToCSV(invoices.filter(i => selected.has(i.id)))} className="h-7 text-xs">
                <Download className="mr-1.5 h-3.5 w-3.5" />Exporter
              </Button>
              <Button size="sm" variant="outline" onClick={bulkDelete} disabled={bulkLoading} className="h-7 text-xs text-red-600 hover:text-red-700 hover:border-red-300">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer
              </Button>
            </div>
            <button onClick={clearSelection} aria-label="Désélectionner tout" className="ml-auto text-blue-400 hover:text-brand-600 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-3 md:hidden">
          {loading ? <p role="status">Chargement…</p> : !paginated.length ? <p className="rounded border p-4">Aucune facture ne correspond à vos filtres.</p> : paginated.map(invoice => <article key={invoice.id} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" checked={selected.has(invoice.id)} onChange={() => toggleSelect(invoice.id)} aria-label={`Sélectionner ${invoice.invoice_number}`} />
              <div className="min-w-0 flex-1 break-words"><Link className="font-semibold" href={`/dashboard/invoices/${invoice.id}`}>{invoice.client_name}</Link><p className="text-sm text-gray-500">{invoice.invoice_number}</p></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-gray-500">Reste à payer</p><p className="text-xl font-semibold">{formatEuro(outstanding(invoice))}</p></div><StatusBadge status={invoice.status} /></div>
            <p className="text-sm">Échéance : {formatDate(invoice.due_date)}{getDaysOverdue(invoice) > 0 && <span className="ml-2 text-red-700">{getDaysOverdue(invoice)} j de retard</span>}</p>
            <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-block text-sm font-semibold text-brand-700">Ouvrir le suivi →</Link>
          </article>)}
        </div>
        <div className="hidden rounded-lg border bg-white overflow-hidden md:block">
          <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10 pl-4">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center" aria-label="Tout sélectionner">
                    {allPageSelected
                      ? <CheckSquare className="h-4 w-4 text-brand-600" />
                      : <Square className="h-4 w-4 text-gray-400" />}
                  </button>
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead className="text-right">Reste à payer</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4 ml-1" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    {invoices.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="Aucune facture"
                        description="Importez depuis votre logiciel ou créez manuellement."
                        action={
                          <>
                            <Button asChild><Link href="/dashboard/invoices/import"><Upload className="mr-2 h-4 w-4" />Importer CSV</Link></Button>
                            <Button variant="outline" asChild><Link href="/dashboard/invoices/new"><Plus className="mr-2 h-4 w-4" />Créer</Link></Button>
                          </>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={FilterX} iconColor="text-gray-400" iconBg="bg-gray-100"
                        title="Aucun résultat"
                        description="Aucune facture ne correspond à vos filtres."
                        action={<Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1) }}>Réinitialiser</Button>}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice)
                  const isSelected = selected.has(invoice.id)
                  return (
                    <TableRow key={invoice.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}>
                      <TableCell className="pl-4">
                        <button onClick={() => toggleSelect(invoice.id)} aria-label="Sélectionner">
                          {isSelected
                            ? <CheckSquare className="h-4 w-4 text-brand-600" />
                            : <Square className="h-4 w-4 text-gray-300 hover:text-gray-500" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{invoice.client_name}</div>
                        <div className="text-xs text-gray-400">{invoice.client_email || 'Email à compléter'}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatEuro(outstanding(invoice))}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        {daysOverdue > 0 ? (
                          <span className={`text-sm font-semibold ${daysOverdue > 60 ? 'text-red-600' : daysOverdue > 30 ? 'text-orange-500' : 'text-amber-600'}`}>
                            {daysOverdue}j
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">–</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={invoice.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href={`/dashboard/invoices/${invoice.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          {invoice.status !== 'paid' && invoice.status !== 'disputed' && (
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                              <Link href={`/dashboard/invoices/${invoice.id}?action=remind`}><Send className="h-4 w-4" /></Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(visiblePage - 1) * PAGE_SIZE + 1}–{Math.min(visiblePage * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setPage(Math.max(1, visiblePage - 1))} disabled={visiblePage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setPage(Math.min(totalPages, visiblePage + 1))} disabled={visiblePage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
