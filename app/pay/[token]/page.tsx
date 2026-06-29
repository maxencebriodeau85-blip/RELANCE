'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, CreditCard, Shield, Lock, PartyPopper } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import Link from 'next/link'

interface InvoicePublic {
  id: string
  invoice_number: string
  amount: number
  due_date: string
  client_name: string
  creditor_name: string
  days_overdue: number
  status: string
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}

function PaymentPageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const justPaid = searchParams.get('paid') === 'true'

  const [invoice, setInvoice] = useState<InvoicePublic | null>(null)
  const [loading, setLoading] = useState(!justPaid)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (justPaid) {
      // After Stripe redirect — show success immediately, then quietly load invoice details
      fetch(`/api/pay/invoice?token=${token}`)
        .then((r) => r.json())
        .then((data) => { if (!data.error) setInvoice(data) })
        .catch(() => null)
      return
    }

    fetch(`/api/pay/invoice?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setInvoice(data)
      })
      .catch(() => setError('Impossible de charger la facture.'))
      .finally(() => setLoading(false))
  }, [token, justPaid])

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erreur lors de la création du paiement.')
        setPaying(false)
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setPaying(false)
    }
  }

  const isPaid = justPaid || invoice?.status === 'paid'

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-[#1a1656] to-brand-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="brand-orb bg-brand-500/30 h-[300px] w-[300px] -top-20 -left-20" />
      <div className="brand-orb bg-fuchsia-500/20 h-[400px] w-[400px] bottom-0 -right-40" />
      <div className="mb-8 relative">
        <Logo variant="mono-white" size="md" />
      </div>

      <div className="w-full max-w-md">
        {/* Loading state */}
        {loading && !justPaid && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chargement de la facture…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && !justPaid && error && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Lien invalide ou expiré</h2>
            <p className="text-sm text-gray-500">{error}</p>
            <p className="text-xs text-gray-400">Contactez votre créancier pour obtenir un nouveau lien de paiement.</p>
          </div>
        )}

        {/* Success state — shown immediately after Stripe redirect, or if already paid */}
        {isPaid && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              {justPaid ? (
                <PartyPopper className="h-8 w-8 text-green-600" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {justPaid ? 'Paiement confirmé !' : 'Facture déjà réglée'}
              </h2>
              {invoice && (
                <p className="text-sm text-gray-500 mt-1">
                  Facture {invoice.invoice_number} · {formatEuro(invoice.amount)}
                </p>
              )}
            </div>
            {justPaid ? (
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-green-800 font-medium">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Paiement reçu et traité
                </div>
                <p className="text-xs text-green-700 pl-6">
                  Votre créancier a été notifié automatiquement. Vous recevrez une confirmation par email sous peu.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Cette facture a déjà été payée. Merci !
              </p>
            )}
          </div>
        )}

        {/* Payment form — shown only when not paid and no error */}
        {!loading && !justPaid && !error && invoice && invoice.status !== 'paid' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold mb-1">
                Règlement de facture
              </p>
              <h1 className="text-xl font-bold">{invoice.creditor_name}</h1>
            </div>

            {/* Invoice details */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Facture n°</span>
                  <span className="text-sm font-semibold font-mono text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Destinataire</span>
                  <span className="text-sm font-medium text-gray-900">{invoice.client_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Échéance</span>
                  <span className="text-sm text-gray-900">{formatDate(invoice.due_date)}</span>
                </div>
                {invoice.days_overdue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Retard</span>
                    <span className="text-sm font-semibold text-red-600">{invoice.days_overdue} jour{invoice.days_overdue > 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Montant TTC</span>
                  <span className="text-2xl font-bold text-blue-700">{formatEuro(invoice.amount)}</span>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-white font-semibold text-base disabled:opacity-60 transition-all hover:shadow-xl hover:shadow-brand-500/30"
              >
                {paying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirection vers le paiement…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Payer {formatEuro(invoice.amount)} maintenant
                  </>
                )}
              </button>

              {error && (
                <p className="text-xs text-red-600 text-center">{error}</p>
              )}

              <div className="flex items-center justify-center gap-6 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Lock className="h-3 w-3" />
                  Connexion chiffrée TLS
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Shield className="h-3 w-3" />
                  Sécurisé par Stripe
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-blue-300/40 mt-6">
          Propulsé par RelanceFlow · Paiement sécurisé Stripe
        </p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    }>
      <PaymentPageInner />
    </Suspense>
  )
}
