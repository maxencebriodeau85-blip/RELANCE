'use client'

import { Suspense, useState, useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
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
import { loginAction } from './actions'
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full h-11 text-base" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connexion en cours…
        </span>
      ) : (
        'Se connecter'
      )}
    </Button>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectedFrom') || '/dashboard'
  const urlError = searchParams.get('error')

  const [state, formAction] = useFormState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  // Once the server action confirms success (cookies already set in the HTTP
  // response), do a hard navigation. The browser will send the new cookies
  // on this request, so the middleware will see a valid session.
  useEffect(() => {
    if (state?.success) {
      window.location.href = redirectTo
    }
  }, [state, redirectTo])

  const errorMessage = state?.error || urlError

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">Connexion</CardTitle>
        <CardDescription className="text-gray-500">
          Accédez à votre espace de recouvrement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
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

          <SubmitButton />
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
        {/* Logo */}
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
