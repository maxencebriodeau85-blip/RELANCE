'use client'

import { useEffect } from 'react'
import { Zap, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">RelanceFlow</span>
      </Link>

      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-5">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Erreur inattendue</h2>
      <p className="text-blue-200/70 mb-1 max-w-sm text-sm">
        Quelque chose s&apos;est mal passé. Notre équipe a été notifiée.
      </p>
      {error.digest && (
        <p className="text-xs text-blue-400/50 font-mono mb-6">Réf : {error.digest}</p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-white/20 text-white/80 hover:text-white px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
