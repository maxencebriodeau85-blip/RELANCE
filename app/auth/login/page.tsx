'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { supabaseAuthError } from '@/lib/auth-errors'

function LoginForm() {
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirectedFrom') ?? ''
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(supabaseAuthError(signInError.message, signInError.status))
        setLoading(false)
        return
      }

      // createBrowserClient writes the session to document.cookie synchronously.
      // window.location.href triggers a full HTTP navigation that includes those
      // cookies — no timing gap, no race condition.
      window.location.href = redirectTo
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">Connexion</CardTitle>
        <CardDescription className="text-gray-500">
          Accédez à votre espace de recouvrement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Adresse email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@entreprise.fr"
              required
              autoComplete="email"
              autoFocus
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Mot de passe oublié ?
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
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 accent-blue-600"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
              Se souvenir de moi
            </span>
          </label>

          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion en cours…
              </span>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-2">
        <p className="text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/auth/register" className="font-semibold text-blue-600 hover:underline">
            Démarrer l&apos;essai gratuit
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400">
          14 jours gratuits · Sans carte bancaire · Annulation à tout moment
        </p>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30 group-hover:bg-blue-400 transition-colors">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">RelanceFlow</span>
        </Link>

        <Suspense fallback={<div className="h-96 animate-pulse bg-white/10 rounded-2xl" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-blue-300/60 mt-6">
          Données hébergées en Europe · Conforme RGPD
        </p>
      </div>
    </div>
  )
}
