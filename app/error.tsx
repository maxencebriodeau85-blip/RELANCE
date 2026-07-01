'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

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
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="brand-orb bg-rose-500/20 h-[300px] w-[300px] -top-20 -right-20" />
      <div className="mb-10 relative">
        <Logo variant="mono-white" size="md" />
      </div>

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
          className="flex items-center gap-2 rounded-lg bg-brand-gradient text-white font-semibold px-5 py-2.5 text-sm transition-all hover:shadow-lg hover:shadow-brand-500/30"
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
