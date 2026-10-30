'use client'
import { useState } from 'react'
export function CheckoutButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function checkout() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'starter' }),
      })
      const data = await response.json()
      if (!response.ok || !data.url)
        throw new Error(data.error || 'Paiement indisponible.')
      window.location.assign(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Paiement indisponible.')
      setBusy(false)
    }
  }
  return (
    <div>
      <button type="button" disabled={busy} onClick={checkout} className="rf-button rf-button-dark w-full disabled:cursor-wait disabled:opacity-70">
        {busy ? 'Ouverture…' : 'Choisir l’offre fondateur'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  )
}
