'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import {
  generateFormalNotice,
  calculatePenalties,
  type FormalNoticeData,
} from '@/lib/formal-notice-template'
import { formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import { AlertTriangle, Download, Printer, Info, Eye } from 'lucide-react'
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
]

function MiseEnDemeurContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(searchParams.get('invoice') || '')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [creditorInfo, setCreditorInfo] = useState({
    creditorName: 'Ma Société',
    creditorAddress: '1 rue de la République, 75001 Paris',
    creditorSiren: '',
    creditorEmail: 'contact@masociete.fr',
    creditorPhone: '',
  })

  const [debtorInfo, setDebtorInfo] = useState({
    debtorAddress: '',
    debtorSiren: '',
  })

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .neq('status', 'paid')
            .order('due_date', { ascending: true })
          if (data && data.length > 0) {
            setInvoices(data as Invoice[])
          }

          // Load profile for creditor info
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (profile) {
            setCreditorInfo((c) => ({
              ...c,
              creditorName: profile.company_name || c.creditorName,
              creditorEmail: profile.email || c.creditorEmail,
              creditorSiren: profile.siren || '',
            }))
          }
        }
      } catch {
        // use mock
      }
    }
    loadInvoices()
  }, [])

  useEffect(() => {
    if (selectedInvoiceId) {
      const inv = invoices.find((i) => i.id === selectedInvoiceId)
      setSelectedInvoice(inv || null)
      if (inv) {
        setDebtorInfo({
          debtorAddress: inv.client_address || '',
          debtorSiren: inv.client_siren || '',
        })
      }
    }
  }, [selectedInvoiceId, invoices])

  const getFormalNoticeData = (): FormalNoticeData | null => {
    if (!selectedInvoice) return null
    return {
      ...creditorInfo,
      debtorName: selectedInvoice.client_name,
      debtorAddress: debtorInfo.debtorAddress || selectedInvoice.client_address || '',
      debtorSiren: debtorInfo.debtorSiren || selectedInvoice.client_siren || undefined,
      invoiceNumber: selectedInvoice.invoice_number,
      invoiceAmount: selectedInvoice.amount,
      invoiceDueDate: selectedInvoice.due_date,
      invoiceIssuedDate: selectedInvoice.issued_date,
      daysOverdue: getDaysOverdue(selectedInvoice),
    }
  }

  const formalNoticeData = getFormalNoticeData()
  const noticeResult = formalNoticeData ? generateFormalNotice(formalNoticeData) : null

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadTxt = () => {
    if (!noticeResult) return
    const blob = new Blob([noticeResult.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mise-en-demeure-${selectedInvoice?.invoice_number || 'facture'}.txt`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Téléchargement démarré',
      description: 'La mise en demeure a été téléchargée au format texte.',
    })
  }

  return (
    <div>
      <Toaster />
      <Header
        title="Générateur de mise en demeure"
        description="Générez une mise en demeure conforme au droit français"
      />

      <div className="p-6 space-y-6">
        {/* Legal notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Base légale</AlertTitle>
          <AlertDescription>
            La mise en demeure est encadrée par l&apos;art. 1344 du Code civil et les art. L441-10 à
            L441-12 du Code de commerce. Pour avoir valeur légale, elle doit être envoyée par{' '}
            <strong>lettre recommandée avec accusé de réception (LRAR)</strong>.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="space-y-4">
            {/* Select invoice */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sélectionner la facture</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedInvoiceId}
                  onValueChange={setSelectedInvoiceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une facture..." />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} · {inv.client_name} · {formatEuro(inv.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedInvoice && (
                  <div className="mt-3 rounded-lg border bg-gray-50 p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Client</span>
                      <span className="font-medium">{selectedInvoice.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant</span>
                      <span className="font-medium">{formatEuro(selectedInvoice.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Échéance</span>
                      <span className="font-medium text-red-600">
                        {formatDate(selectedInvoice.due_date)} (
                        {getDaysOverdue(selectedInvoice)}j de retard)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Creditor info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vos coordonnées (créancier)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nom / Raison sociale</Label>
                  <Input
                    value={creditorInfo.creditorName}
                    onChange={(e) =>
                      setCreditorInfo((c) => ({ ...c, creditorName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse complète</Label>
                  <Input
                    value={creditorInfo.creditorAddress}
                    onChange={(e) =>
                      setCreditorInfo((c) => ({ ...c, creditorAddress: e.target.value }))
                    }
                    placeholder="15 rue de la Paix, 75001 Paris"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>SIREN</Label>
                    <Input
                      value={creditorInfo.creditorSiren}
                      onChange={(e) =>
                        setCreditorInfo((c) => ({ ...c, creditorSiren: e.target.value }))
                      }
                      placeholder="123456789"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input
                      value={creditorInfo.creditorPhone}
                      onChange={(e) =>
                        setCreditorInfo((c) => ({ ...c, creditorPhone: e.target.value }))
                      }
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={creditorInfo.creditorEmail}
                    onChange={(e) =>
                      setCreditorInfo((c) => ({ ...c, creditorEmail: e.target.value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Debtor info (if missing) */}
            {selectedInvoice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Coordonnées du débiteur
                  </CardTitle>
                  <CardDescription>
                    Complétez si les informations sont manquantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Adresse complète du débiteur</Label>
                    <Input
                      value={debtorInfo.debtorAddress}
                      onChange={(e) =>
                        setDebtorInfo((d) => ({ ...d, debtorAddress: e.target.value }))
                      }
                      placeholder="8 avenue des Entrepreneurs, 69003 Lyon"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SIREN du débiteur</Label>
                    <Input
                      value={debtorInfo.debtorSiren}
                      onChange={(e) =>
                        setDebtorInfo((d) => ({ ...d, debtorSiren: e.target.value }))
                      }
                      placeholder="987654321"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Penalties preview */}
            {noticeResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Calcul des pénalités</CardTitle>
                  <CardDescription>
                    BCE (4,5%) + 10 points = 14,5% l&apos;an · Indemnité forfaitaire : 40 €
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Montant principal</span>
                    <span className="font-medium">{formatEuro(noticeResult.penalties.principal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Pénalités ({noticeResult.penalties.penaltyRate}% × {getDaysOverdue(selectedInvoice!)}j)
                    </span>
                    <span className="font-medium">{formatEuro(noticeResult.penalties.penaltyAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Indemnité forfaitaire (art. D441-5)</span>
                    <span className="font-medium">{formatEuro(noticeResult.penalties.fixedIndemnity)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-base font-bold">
                    <span>TOTAL DÛ</span>
                    <span className="text-red-600">{formatEuro(noticeResult.totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!noticeResult}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Masquer' : 'Aperçu'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadTxt}
                disabled={!noticeResult}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger (.txt)
              </Button>
              <Button onClick={handlePrint} disabled={!noticeResult}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            {noticeResult && showPreview ? (
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Aperçu de la mise en demeure</CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="print:block font-mono text-xs leading-relaxed whitespace-pre-wrap bg-white border rounded p-4 max-h-[70vh] overflow-y-auto"
                    style={{ fontFamily: 'Courier New, monospace' }}
                  >
                    {noticeResult.content}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="flex h-64 items-center justify-center">
                  <div className="text-center text-gray-400">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">
                      Sélectionnez une facture et cliquez sur &quot;Aperçu&quot; pour visualiser la mise en
                      demeure
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* LRAR reminder */}
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important : envoi par LRAR obligatoire</AlertTitle>
          <AlertDescription>
            Pour que votre mise en demeure ait valeur légale, vous devez l&apos;envoyer par{' '}
            <strong>lettre recommandée avec accusé de réception (LRAR)</strong>. Conservez la preuve
            d&apos;envoi et l&apos;accusé de réception dans votre dossier.
          </AlertDescription>
        </Alert>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}

export default function MiseEnDemeurePage() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 animate-pulse bg-gray-50" />}>
      <MiseEnDemeurContent />
    </Suspense>
  )
}
