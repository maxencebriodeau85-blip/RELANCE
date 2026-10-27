'use client'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// Paiement d'abonnement refusé (past_due / incomplete) : l'accès est conservé
// pendant les nouvelles tentatives de Stripe, mais le client doit le savoir
// avant la coupure. Le bouton ouvre le portail Stripe : /api/stripe/checkout
// y renvoie toujours un client qui a déjà un abonnement, jamais vers un
// second paiement.
export function PaymentFailedBanner() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function openPortal() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'starter' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.url) throw new Error(data.error || 'Portail de paiement indisponible. Réessayez.')
      window.location.assign(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portail de paiement indisponible.')
      setBusy(false)
    }
  }

  return (
    <div role="alert" className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" aria-hidden="true" />
        <span>
          Le dernier paiement de votre abonnement a échoué. Mettez à jour votre carte pour garder
          vos relances actives ; sans paiement, l’abonnement sera résilié sous deux semaines.
        </span>
        <button
          type="button"
          onClick={openPortal}
          disabled={busy}
          className="font-medium underline underline-offset-2 disabled:opacity-60"
        >
          {busy ? 'Ouverture…' : 'Mettre à jour ma carte'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}
