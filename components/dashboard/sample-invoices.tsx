'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FlaskConical, Loader2 } from 'lucide-react'

function useSamples(method: 'POST' | 'DELETE') {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/invoices/samples', { method })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Action impossible. Réessayez.')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

/** Espace vide : essayer Encair avec cinq factures fictives, sans fichier. */
export function SampleInvoicesButton() {
  const { busy, error, run } = useSamples('POST')
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
      <span>Pas de fichier sous la main ?</span>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 font-medium text-brand-700 underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />}
        {busy ? 'Création des exemples…' : 'Essayer avec 5 factures d’exemple'}
      </button>
      <span className="text-xs text-gray-400">Hors quota, aucune relance envoyée.</span>
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}

/** Rappel permanent tant que des exemples sont présents. */
export function SampleInvoicesBanner({ count }: { count: number }) {
  const { busy, error, run } = useSamples('DELETE')
  return (
    <div role="status" className="border-b border-sky-200 bg-sky-50 px-5 py-3 text-sm text-sky-950">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FlaskConical className="h-4 w-4 flex-shrink-0 text-sky-700" aria-hidden="true" />
        <span>
          {count > 1 ? `${count} factures d’exemple sont affichées` : 'Une facture d’exemple est affichée'} : aucune
          relance ne part, elles ne comptent pas dans votre quota.
        </span>
        <Link href="/dashboard/invoices/import" className="font-medium underline underline-offset-2">
          Importer mes factures
        </Link>
        <button type="button" onClick={run} disabled={busy} className="font-medium underline underline-offset-2 disabled:opacity-60">
          {busy ? 'Suppression…' : 'Supprimer les exemples'}
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}
