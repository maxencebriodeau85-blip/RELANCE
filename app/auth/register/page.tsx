'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
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
import { registerAction } from './actions'
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          Création du compte…
        </span>
      ) : (
        'Créer mon compte gratuit'
      )}
    </Button>
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort']
  const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${strength >= level ? colors[strength] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">Force : {labels[strength]}</p>
    </div>
  )
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (state?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">RelanceFlow</span>
          </div>
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Vérifiez votre email</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Un email de confirmation a été envoyé à{' '}
                  <strong>{state.email}</strong>. Cliquez sur le lien pour activer votre compte.
                </p>
                <p className="text-gray-400 mt-2 text-xs">
                  Pensez à vérifier vos spams si vous ne le voyez pas dans les 2 minutes.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/login">Retour à la connexion</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">RelanceFlow</span>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
            <CardDescription>
              Commencez votre essai gratuit de 14 jours · Sans carte bancaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de votre entreprise *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Ma Société SARL"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email professionnelle *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vous@entreprise.fr"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                En créant un compte, vous acceptez nos{' '}
                <Link href="/cgu" className="underline font-medium">
                  CGU
                </Link>{' '}
                et notre{' '}
                <Link href="/privacy" className="underline font-medium">
                  politique de confidentialité
                </Link>
                .
              </div>

              <SubmitButton />
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-center w-full text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
