'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/invoices/status-badge'
import { formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  Mail,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { Invoice, Reminder } from '@/lib/database.types'

const MOCK_INVOICES: Record<string, Invoice> = {
  '1': {
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
  '2': {
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
}

const MOCK_REMINDERS: Reminder[] = [
  {
    id: 'r1',
    invoice_id: '1',
    user_id: 'user1',
    type: 'email_1',
    sent_at: '2024-01-22T09:00:00Z',
    channel: 'email',
    content: null,
    subject: 'Rappel amiable – Facture n°FA-2024-001',
    status: 'delivered',
    resend_id: 'resend_123',
    created_at: '2024-01-22T09:00:00Z',
  },
]

const reminderTypeLabel: Record<string, string> = {
  email_1: '1ère relance',
  email_2: '2ème relance',
  email_3: '3ème relance',
  formal_notice: 'Mise en demeure',
}

const reminderStatusConfig: Record<string, { label: string; color: string }> = {
  sent: { label: 'Envoyé', color: 'text-blue-600' },
  delivered: { label: 'Délivré', color: 'text-green-600' },
  failed: { label: 'Échec', color: 'text-red-600' },
  bounced: { label: 'Rebondi', color: 'text-orange-600' },
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Try real Supabase
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: inv } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single()

        if (inv) {
          setInvoice(inv as Invoice)
          const { data: rem } = await supabase
            .from('reminders')
            .select('*')
            .eq('invoice_id', id)
            .order('sent_at', { ascending: false })
          setReminders((rem as Reminder[]) || [])
        } else {
          // Use mock
          setInvoice(MOCK_INVOICES[id] || null)
          setReminders(MOCK_REMINDERS.filter((r) => r.invoice_id === id))
        }
      } catch {
        setInvoice(MOCK_INVOICES[id] || null)
        setReminders(MOCK_REMINDERS.filter((r) => r.invoice_id === id))
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleSendReminder = async () => {
    if (!invoice) return
    setSending(true)
    try {
      const response = await fetch(`/api/invoices/${id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email_1' }),
      })

      if (response.ok) {
        toast({
          title: 'Relance envoyée !',
          description: `Un email de relance a été envoyé à ${invoice.client_email}`,
          variant: 'success' as any,
        })
        // Refresh data
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: rem } = await supabase
          .from('reminders')
          .select('*')
          .eq('invoice_id', id)
          .order('sent_at', { ascending: false })
        if (rem) setReminders(rem as Reminder[])
      } else {
        const err = await response.json()
        toast({
          title: 'Erreur',
          description: err.error || 'Impossible d\'envoyer la relance',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la relance pour le moment',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Facture introuvable</AlertTitle>
          <AlertDescription>
            Cette facture n&apos;existe pas ou vous n&apos;y avez pas accès.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    )
  }

  const daysOverdue = getDaysOverdue(invoice)

  return (
    <div>
      <Toaster />
      <Header
        title={`Facture ${invoice.invoice_number}`}
        description={invoice.client_name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            {invoice.status !== 'paid' && invoice.status !== 'disputed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendReminder}
                  disabled={sending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? 'Envoi...' : 'Envoyer relance'}
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/mise-en-demeure?invoice=${invoice.id}`}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Mise en demeure
                  </Link>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Alert if overdue */}
        {daysOverdue > 0 && invoice.status !== 'paid' && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Facture en retard de {daysOverdue} jour(s)</AlertTitle>
            <AlertDescription>
              Cette facture aurait dû être réglée le {formatDate(invoice.due_date)}.
              {invoice.status === 'pending' && ' Envoyez une relance dès maintenant.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Invoice info */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Détails de la facture</CardTitle>
                  <StatusBadge status={invoice.status} />
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    N° Facture
                  </div>
                  <div className="font-mono font-medium">{invoice.invoice_number}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Montant TTC
                  </div>
                  <div className="text-xl font-bold text-gray-900">{formatEuro(invoice.amount)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Date d&apos;émission
                  </div>
                  <div>{formatDate(invoice.issued_date)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Date d&apos;échéance
                  </div>
                  <div className={daysOverdue > 0 ? 'text-red-600 font-medium' : ''}>
                    {formatDate(invoice.due_date)}
                    {daysOverdue > 0 && ` (${daysOverdue}j de retard)`}
                  </div>
                </div>
                {invoice.notes && (
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Notes
                    </div>
                    <div className="text-sm text-gray-600">{invoice.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations client</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Nom / Raison sociale
                  </div>
                  <div className="font-medium">{invoice.client_name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <a href={`mailto:${invoice.client_email}`} className="text-blue-600 hover:underline">
                      {invoice.client_email}
                    </a>
                  </div>
                </div>
                {invoice.client_address && (
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Adresse
                    </div>
                    <div className="text-sm">{invoice.client_address}</div>
                  </div>
                )}
                {invoice.client_siren && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      SIREN
                    </div>
                    <div className="font-mono text-sm">{invoice.client_siren}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reminder history */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historique des relances</CardTitle>
                <CardDescription>{reminders.length} relance(s) envoyée(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {reminders.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucune relance envoyée</p>
                    {invoice.status !== 'paid' && invoice.status !== 'disputed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={handleSendReminder}
                        disabled={sending}
                      >
                        <Send className="mr-2 h-3.5 w-3.5" />
                        {sending ? 'Envoi...' : 'Envoyer la 1ère relance'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline */}
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {reminders.map((reminder, index) => {
                        const statusConf = reminderStatusConfig[reminder.status] || { label: reminder.status, color: 'text-gray-500' }
                        return (
                          <div key={reminder.id} className="relative pl-8">
                            <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-blue-600 bg-white" />
                            <div className="text-xs font-medium text-gray-900">
                              {reminderTypeLabel[reminder.type] || reminder.type}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(reminder.sent_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className={`text-xs mt-0.5 ${statusConf.color}`}>
                              {statusConf.label} · {reminder.channel}
                            </div>
                            {reminder.subject && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate">
                                {reminder.subject}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
