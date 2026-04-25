'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/invoices/status-badge'
import { formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import { Plus, Upload, Search, ChevronLeft, ChevronRight, Eye, Send } from 'lucide-react'
import Link from 'next/link'
import type { Invoice, InvoiceStatus } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/client'

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
  {
    id: '6',
    user_id: 'user1',
    client_name: 'Rénov Pro',
    client_email: 'contact@renovpro.fr',
    client_address: null,
    client_siren: null,
    invoice_number: 'FA-2024-006',
    amount: 3400,
    due_date: '2024-03-01',
    issued_date: '2024-02-01',
    status: 'pending',
    notes: null,
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
  },
]

const PAGE_SIZE = 10

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          if (data && data.length > 0) {
            setInvoices(data as Invoice[])
          }
        }
      } catch {
        // keep mock
      } finally {
        setLoading(false)
      }
    }
    loadInvoices()
  }, [])

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      search === '' ||
      inv.client_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <Header
        title="Factures"
        description={`${filtered.length} facture(s) au total`}
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

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par client ou n° facture..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-48">
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
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Client</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice)
                  return (
                    <TableRow key={invoice.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{invoice.client_name}</div>
                          <div className="text-xs text-gray-400">{invoice.client_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatEuro(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>
                        {daysOverdue > 0 ? (
                          <span className="text-sm font-medium text-red-600">
                            {daysOverdue}j
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">–</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/invoices/${invoice.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {invoice.status !== 'paid' && invoice.status !== 'disputed' && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/invoices/${invoice.id}?action=remind`}>
                                <Send className="h-4 w-4" />
                              </Link>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur{' '}
              {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
