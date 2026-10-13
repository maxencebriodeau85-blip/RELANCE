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
import { createClient } from '@/lib/supabase/client'
import { supabaseAuthError } from '@/lib/auth-errors'
import { CTA_LABEL } from '@/lib/plans'

function LoginForm() {
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirectedFrom') ?? ''
  // Only same-origin absolute paths. Reject protocol-relative (//evil.com)
  // AND backslash tricks (/\evil.com, which some browsers normalise to //).
  const redirectTo =
    /^\/[^/\\]/.test(rawRedirect) ? rawRedirect : '/dashboard'

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
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(supabaseAuthError(signInError.message, signInError.status))
        setLoading(false)
        return
      }

      window.location.href = redirectTo
    } catch (err) {
      // Distinguish the real cause instead of a useless catch-all. The #1
      // reason a fresh deploy "can't log in" is missing Supabase env vars.
      const msg = err instanceof Error ? err.message : ''
      // Message neutre pour l'utilisateur ; le détail technique reste dans la console.
      console.error('[login]', msg)
      if (/failed to fetch|networkerror|network request failed/i.test(msg)) {
        setError('Le service de connexion ne répond pas. Vérifiez votre connexion internet et réessayez dans un instant.')
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <AuthSidePanel />

      {/* Right — form. Extra bottom padding on mobile so the vertically
          centered form clears the fixed cookie banner (which otherwise
          covers the "Se connecter" button on short screens). */}
      <div className="flex-1 flex items-center justify-center p-6 pb-28 sm:pb-6 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="text-gray-500 mt-1 text-sm">Accédez à votre espace Encair</p>
          </div>

          <AuthConfigNotice />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
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
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-brand-gradient disabled:opacity-60 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-500/30 flex items-center justify-center gap-2"
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

          <p className="mt-6 text-center text-sm text-gray-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="font-semibold text-blue-600 hover:underline">
              {CTA_LABEL}
            </Link>
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Sans carte bancaire</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Sans engagement</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
