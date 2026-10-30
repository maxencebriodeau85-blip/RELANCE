'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { AuthConfigNotice } from '@/components/auth/config-notice'
import { AuthSidePanel } from '@/components/auth/auth-side-panel'
import { safeRedirect } from '@/lib/auth-navigation'
import { CTA_LABEL } from '@/lib/plans'

function LoginForm() {
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirectedFrom') ?? ''
  const redirectTo = safeRedirect(rawRedirect)

  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = (form.get('email') as string)?.trim()
    const password = form.get('password') as string

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, redirectTo }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'La connexion a échoué.')
      window.location.assign(safeRedirect(result.redirectTo))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La connexion est indisponible. Réessayez.')
      setLoading(false)
    }
  }

  return (
    <main id="main-content" className="rf-auth-shell">
      <AuthSidePanel compact />

      <div className="flex min-w-0 flex-1 items-start justify-center px-5 py-7 sm:p-8 lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="text-gray-500 mt-1 text-sm">Accédez à votre espace Encair</p>
          </div>

          <AuthConfigNotice />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@entreprise.fr"
                required
                autoComplete="email"
                autoFocus
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mot de passe
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-[#a64829] hover:text-[#78351f] hover:underline"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-gray-600 hover:text-[#182b40]"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#182b40] disabled:opacity-60 text-white font-semibold text-sm transition-colors hover:bg-[#294059] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs"><Link href="/auth/resend" className="text-brand-700 underline">Email de confirmation non reçu ?</Link></p>
          <p className="mt-6 text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="font-semibold text-[#a64829] hover:underline">
              {CTA_LABEL}
            </Link>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Sans carte bancaire</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Sans engagement</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
