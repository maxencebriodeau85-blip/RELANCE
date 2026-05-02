'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Zap, CheckCircle, AlertCircle, Loader2, CreditCard, Shield, Lock } from 'lucide-react'
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

export default function PaymentPage() {
  const params = useParams()
  const token = params.token as string

  const [invoice, setInvoice] = useState<InvoicePublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/pay/invoice?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setInvoice(data)
      })
      .catch(() => setError('Impossible de charger la facture.'))
      .finally(() => setLoading(false))
  }, [token])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">RelanceFlow</span>
      </Link>

      <div className="w-full max-w-md">
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chargement de la facture…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Lien invalide</h2>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        )}

        {!loading && invoice && invoice.status === 'paid' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Facture déjà réglée</h2>
            <p className="text-sm text-gray-500">
              La facture {invoice.invoice_number} a déjà été payée. Merci !
            </p>
          </div>
        )}

        {!loading && invoice && invoice.status !== 'paid' && (
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
                    <span className="text-sm font-semibold text-red-600">{invoice.days_overdue} jours</span>
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {paying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Redirection vers le paiement…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Payer {formatEuro(invoice.amount)}
                  </>
                )}
              </button>

              {error && (
                <p className="text-xs text-red-600 text-center">{error}</p>
              )}

              <div className="flex items-center justify-center gap-4 pt-1">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Lock className="h-3 w-3" />
                  Paiement sécurisé
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Shield className="h-3 w-3" />
                  Stripe
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-blue-300/50 mt-6">
          Propulsé par RelanceFlow · Paiement sécurisé par Stripe
        </p>
      </div>
    </div>
  )
}
