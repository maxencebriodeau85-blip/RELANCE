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
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

  const errorMessage = state?.error || urlError

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
        <CardDescription>Connectez-vous à votre espace RelanceFlow</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Pass redirectTo as hidden field so the server action can use it */}
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="vous@entreprise.fr"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
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
                className="pr-10"
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

          <SubmitButton />
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <p className="text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/auth/register" className="font-medium text-blue-600 hover:underline">
            Créer un compte gratuit
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400">
          Essai gratuit 14 jours · Pas de carte bancaire requise
        </p>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">RelanceFlow</span>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse bg-white rounded-lg" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
