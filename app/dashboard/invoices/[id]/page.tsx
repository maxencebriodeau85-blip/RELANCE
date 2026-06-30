'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/invoices/status-badge'
import { formatEuro, formatDate, getDaysOverdue } from '@/lib/metrics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  Mail,
  CheckCircle,
  Trash2,
  Copy,
  Link2,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  FileDown,
} from 'lucide-react'
import Link from 'next/link'
import type { Invoice, Reminder } from '@/lib/database.types'

const reminderTypeLabel: Record<string, string> = {
  email_1: '1ère relance',
  email_2: '2ème relance',
  email_3: '3ème relance',
  formal_notice: 'Mise en demeure',
}

const reminderTypeTone: Record<string, string> = {
  email_1: 'Ton cordial',
  email_2: 'Ton ferme',
  email_3: 'Ton pré-contentieux',
  formal_notice: 'Légal',
}

const reminderStatusConfig: Record<string, { label: string; color: string; dot: string }> = {
  sent: { label: 'Envoyé', color: 'text-blue-600', dot: 'bg-blue-500' },
  delivered: { label: 'Délivré', color: 'text-green-600', dot: 'bg-green-500' },
  opened: { label: 'Ouvert', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  clicked: { label: 'Cliqué', color: 'text-purple-600', dot: 'bg-purple-500' },
  failed: { label: 'Échec', color: 'text-red-600', dot: 'bg-red-500' },
  bounced: { label: 'Rebondi', color: 'text-orange-600', dot: 'bg-orange-500' },
  complained: { label: 'Spam signalé', color: 'text-red-700', dot: 'bg-red-600' },
}

function formatTime(s: string): string {
  return new Date(s).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function getNextReminderType(reminders: Reminder[]): 'email_1' | 'email_2' | 'email_3' | 'formal_notice' {
  const sent = new Set(reminders.map((r) => r.type))
  if (!sent.has('email_1')) return 'email_1'
  if (!sent.has('email_2')) return 'email_2'
  if (!sent.has('email_3')) return 'email_3'
  return 'formal_notice'
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
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedReminderType, setSelectedReminderType] = useState<'email_1' | 'email_2' | 'email_3' | 'formal_notice'>('email_1')
  const [showReminderPicker, setShowReminderPicker] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (!inv) { setInvoice(null); setLoading(false); return }

      setInvoice(inv as Invoice)

      const { data: rem } = await supabase
        .from('reminders')
        .select('*')
        .eq('invoice_id', id)
        .order('sent_at', { ascending: false })

      const remList = (rem as Reminder[]) || []
      setReminders(remList)
      setSelectedReminderType(getNextReminderType(remList))
    } catch {
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  const handleSendReminder = async () => {
    if (!invoice) return
    setSending(true)
    try {
      const response = await fetch(`/api/invoices/${id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedReminderType }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Relance envoyée !',
          description: `${reminderTypeLabel[selectedReminderType]} envoyée à ${invoice.client_email}`,
        })
        await loadData()
      } else {
        toast({
          title: 'Erreur',
          description: data.error || "Impossible d'envoyer la relance",
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer la relance', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!invoice) return
    setUpdatingStatus(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('invoices').update({ status: 'paid' } as never).eq('id', invoice.id)
      setInvoice({ ...invoice, status: 'paid' })
      toast({ title: 'Facture marquée comme payée', description: `${invoice.invoice_number} clôturée.` })
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleMarkDisputed = async () => {
    if (!invoice) return
    setUpdatingStatus(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('invoices').update({ status: 'disputed' } as never).eq('id', invoice.id)
      setInvoice({ ...invoice, status: 'disputed' })
      toast({ title: 'Facture marquée comme litigieuse', description: `${invoice.invoice_number} mise en litige.` })
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return
    if (!confirm(`Supprimer définitivement la facture ${invoice.invoice_number} ? Cette action est irréversible.`)) return
    setDeleting(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('invoices').delete().eq('id', invoice.id)
      toast({ title: 'Facture supprimée', description: `${invoice.invoice_number} supprimée.` })
      router.push('/dashboard/invoices')
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer la facture.', variant: 'destructive' })
      setDeleting(false)
    }
  }

  const handleCopyPaymentLink = async () => {
    if (!invoice) return
    const token = (invoice as any).payment_token as string | null
    if (!token) {
      toast({ title: 'Lien indisponible', description: 'Cette facture ne dispose pas encore de lien de paiement.', variant: 'destructive' })
      return
    }
    // Use the current origin so the payment link points to the same host
    // the user is browsing — works on preview deployments AND production
    // without depending on a build-time env var that might be stale.
    const url = `${window.location.origin}/pay/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
      toast({ title: 'Lien copié !', description: 'Le lien de paiement est dans votre presse-papiers.' })
    } catch {
      toast({ title: 'Lien de paiement', description: url })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="text-sm">Chargement de la facture…</span>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-6 max-w-lg">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Facture introuvable</AlertTitle>
          <AlertDescription>
            Cette facture n&apos;existe pas ou vous n&apos;y avez pas accès.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux factures
          </Link>
        </Button>
      </div>
    )
  }

  const daysOverdue = getDaysOverdue(invoice)
  const canSendReminder = invoice.status !== 'paid' && invoice.status !== 'disputed'
  const paymentToken = (invoice as any).payment_token as string | null
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const paymentLink = paymentToken ? `${appOrigin}/pay/${paymentToken}` : null

  return (
    <div>
      <Header
        title={`Facture ${invoice.invoice_number}`}
        description={invoice.client_name}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="mr-2 h-4 w-4" />
                Télécharger PDF
              </a>
            </Button>
            {paymentLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPaymentLink}
                className={copySuccess ? 'border-green-300 text-green-700' : ''}
              >
                {copySuccess ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copySuccess ? 'Copié !' : 'Lien de paiement'}
              </Button>
            )}
            {canSendReminder && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsPaid}
                disabled={updatingStatus}
                className="text-green-700 hover:bg-green-50 border-green-200"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marquer payée
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Overdue alert */}
        {daysOverdue > 0 && invoice.status !== 'paid' && invoice.status !== 'disputed' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Retard de paiement · {daysOverdue} jour{daysOverdue > 1 ? 's' : ''}</AlertTitle>
            <AlertDescription className="text-red-700">
              Échéance dépassée depuis le {formatDate(invoice.due_date)}.{' '}
              {invoice.status === 'pending' && 'Envoyez une 1ère relance dès maintenant.'}
              {invoice.status === 'reminded' && 'Passez à la 2ème relance ou à la mise en demeure.'}
            </AlertDescription>
          </Alert>
        )}
        {invoice.status === 'paid' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Facture réglée</AlertTitle>
            <AlertDescription className="text-green-700">
              Cette facture a été payée — aucune action requise.
            </AlertDescription>
          </Alert>
        )}
        {invoice.status === 'disputed' && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Facture en litige</AlertTitle>
            <AlertDescription className="text-orange-700">
              Cette facture est marquée comme litigieuse — plus aucune relance ne sera envoyée automatiquement.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: invoice + client info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Invoice details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Détails de la facture</CardTitle>
                  <StatusBadge status={invoice.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">N° Facture</div>
                    <div className="font-mono font-semibold text-gray-900">{invoice.invoice_number}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Montant TTC</div>
                    <div className="text-2xl font-bold text-gray-900">{formatEuro(invoice.amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date d&apos;émission</div>
                    <div className="text-sm text-gray-700">{formatDate(invoice.issued_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date d&apos;échéance</div>
                    <div className={`text-sm font-medium ${daysOverdue > 0 && invoice.status !== 'paid' ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatDate(invoice.due_date)}
                      {daysOverdue > 0 && invoice.status !== 'paid' && (
                        <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          +{daysOverdue}j
                        </span>
                      )}
                    </div>
                  </div>
                  {invoice.description && (
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Désignation / prestation</div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">{invoice.description}</div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mention TVA</div>
                    <div className="text-sm text-gray-600 italic">{invoice.vat_mention}</div>
                  </div>
                  {invoice.notes && (
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes internes</div>
                      <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">{invoice.notes}</div>
                    </div>
                  )}
                </div>

                {/* Payment link row */}
                {paymentLink && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Lien de paiement débiteur</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-1.5 min-w-0">
                        <Link2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <code className="text-xs text-gray-600 truncate">{paymentLink}</code>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleCopyPaymentLink} className={copySuccess ? 'border-green-300 text-green-700' : ''}>
                        {copySuccess ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Envoyez ce lien à votre client pour qu&apos;il paie directement par carte.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations client</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Raison sociale</div>
                  <div className="font-medium text-gray-900">{invoice.client_name}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</div>
                  <a href={`mailto:${invoice.client_email}`} className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {invoice.client_email}
                  </a>
                </div>
                {invoice.client_address && (
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Adresse</div>
                    <div className="text-sm text-gray-700">{invoice.client_address}</div>
                  </div>
                )}
                {invoice.client_siren && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">SIREN</div>
                    <div className="font-mono text-sm text-gray-700">{invoice.client_siren}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send reminder card */}
            {canSendReminder && (
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-blue-600" />
                    Envoyer une relance
                  </CardTitle>
                  <CardDescription>Choisissez le type de relance adapté à la situation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Type picker */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['email_1', 'email_2', 'email_3', 'formal_notice'] as const).map((t) => {
                      const sent = reminders.some((r) => r.type === t)
                      return (
                        <button
                          key={t}
                          onClick={() => setSelectedReminderType(t)}
                          className={`relative rounded-lg border p-2.5 text-left transition-all ${
                            selectedReminderType === t
                              ? 'border-blue-500 bg-white shadow-sm ring-1 ring-blue-500'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {sent && (
                            <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-500" title="Déjà envoyé" />
                          )}
                          <div className="text-xs font-semibold text-gray-900">{reminderTypeLabel[t]}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{reminderTypeTone[t]}</div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleSendReminder} disabled={sending} className="flex-1 sm:flex-none">
                      <Send className="mr-2 h-4 w-4" />
                      {sending ? 'Envoi en cours…' : `Envoyer — ${reminderTypeLabel[selectedReminderType]}`}
                    </Button>
                    {selectedReminderType === 'formal_notice' && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/mise-en-demeure?invoice=${invoice.id}`}>
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Version avancée
                        </Link>
                      </Button>
                    )}
                  </div>
                  {selectedReminderType === 'formal_notice' && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      La mise en demeure a une valeur légale. Elle inclut automatiquement les pénalités de retard (3× taux légal) et l&apos;indemnité forfaitaire de 40 €.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: reminder history */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Historique des relances
                </CardTitle>
                <CardDescription>
                  {reminders.length === 0 ? 'Aucune relance envoyée' : `${reminders.length} relance${reminders.length > 1 ? 's' : ''} envoyée${reminders.length > 1 ? 's' : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reminders.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Aucune relance encore</p>
                    <p className="text-xs text-gray-400 mt-1">Les relances envoyées apparaîtront ici.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />
                    <div className="space-y-5">
                      {reminders.map((reminder) => {
                        const sc = reminderStatusConfig[reminder.status] || { label: reminder.status, color: 'text-gray-500', dot: 'bg-gray-400' }
                        const r = reminder as typeof reminder & {
                          delivered_at?: string | null
                          opened_at?: string | null
                          clicked_at?: string | null
                          bounced_at?: string | null
                          complained_at?: string | null
                        }
                        const events = [
                          { label: 'Envoyé', at: reminder.sent_at, dot: 'bg-blue-500' },
                          r.delivered_at && { label: 'Délivré', at: r.delivered_at, dot: 'bg-green-500' },
                          r.opened_at && { label: 'Ouvert', at: r.opened_at, dot: 'bg-emerald-500' },
                          r.clicked_at && { label: 'Cliqué', at: r.clicked_at, dot: 'bg-purple-500' },
                          r.bounced_at && { label: 'Rebondi', at: r.bounced_at, dot: 'bg-orange-500' },
                          r.complained_at && { label: 'Spam signalé', at: r.complained_at, dot: 'bg-red-600' },
                        ].filter(Boolean) as { label: string; at: string; dot: string }[]

                        return (
                          <div key={reminder.id} className="relative pl-9">
                            <div className={`absolute left-2 top-1.5 h-3 w-3 rounded-full border-2 border-white ${sc.dot}`} />
                            <div className="text-xs font-semibold text-gray-900">
                              {reminderTypeLabel[reminder.type] || reminder.type}
                            </div>
                            {reminder.subject && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate" title={reminder.subject}>
                                {reminder.subject}
                              </div>
                            )}
                            {/* Compact event chip row */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {events.map((e, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px]"
                                  title={formatTime(e.at)}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${e.dot}`} />
                                  <span className="font-medium text-gray-700">{e.label}</span>
                                  <span className="text-gray-400">{formatTime(e.at)}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick dispute button */}
            {canSendReminder && (
              <button
                onClick={handleMarkDisputed}
                disabled={updatingStatus}
                className="mt-3 w-full text-xs text-gray-400 hover:text-orange-600 transition-colors text-center"
              >
                Marquer en litige
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
