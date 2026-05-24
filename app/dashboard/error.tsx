'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-5">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
      <p className="text-sm text-gray-500 mb-1 max-w-sm">
        Le dashboard n&apos;a pas pu se charger correctement.
        {error.digest && (
          <span className="block text-xs text-gray-400 mt-1 font-mono">#{error.digest}</span>
        )}
      </p>

      <div className="flex gap-3 mt-6">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  )
}
