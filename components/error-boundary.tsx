'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// Catches render errors in a subtree and shows a friendly fallback.
// Use this around large interactive blocks (dashboard sections, forms)
// so an unhandled exception doesn't blank the whole page.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md mx-auto my-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-red-900 mb-1">Une erreur est survenue</h3>
        <p className="text-xs text-red-700 mb-4">
          Cette section n&apos;a pas pu se charger. Vous pouvez réessayer ou recharger la page.
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    )
  }
}
