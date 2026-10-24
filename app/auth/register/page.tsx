'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { registerAction } from './actions'
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { AuthConfigNotice } from '@/components/auth/config-notice'
import { AuthSidePanel } from '@/components/auth/auth-side-panel'
import { ResendForm } from '@/components/auth/resend-form'
import { OFFER } from '@/lib/plans'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-brand-gradient disabled:opacity-60 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-brand-500/30 flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Création du compte…
        </>
      ) : (
        'Créer mon compte'
      )}
    </button>
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
      <p className="text-xs text-gray-400">Force : {labels[strength]}</p>
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
      <div className="min-h-screen flex">
        <AuthSidePanel />
        <div className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vérifiez votre email</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Un email de confirmation a été envoyé à{' '}
                <strong className="text-gray-800">{state.email}</strong>. Cliquez sur le lien pour activer votre compte.
              </p>
              <p className="text-gray-400 mt-2 text-xs">
                Pensez à vérifier vos spams s’il n’arrive pas dans les 2 minutes.
              </p>
            </div>
            <ResendForm email={state.email} />
            <Link
              href="/auth/login"
              className="inline-block w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors leading-[44px]"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <AuthSidePanel />

      {/* Right — form (bottom clearance for the fixed cookie banner on mobile) */}
      <div className="flex-1 flex items-center justify-center p-6 pb-28 sm:pb-6 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Créer votre espace Encair</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Essai {OFFER.trialDays} jours, jusqu’à {OFFER.trialInvoiceLimit} factures · Sans carte bancaire · Aucun prélèvement automatique
            </p>
          </div>

          <AuthConfigNotice />

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{state.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                Nom ou raison sociale
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Bureau d’études Martin"
                required
                autoFocus
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email professionnel
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vous@entreprise.fr"
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  required
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
                />
                <span>
                  J’accepte les{' '}
                  <Link href="/cgu" className="underline text-blue-600">conditions générales (CGU/CGV)</Link>{' '}
                  et l’<Link href="/dpa" className="underline text-blue-600">accord de sous-traitance</Link>, et je reconnais
                  avoir pris connaissance de la{' '}
                  <Link href="/privacy" className="underline text-blue-600">politique de confidentialité</Link>.
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                <input
                  type="checkbox"
                  name="professionalUse"
                  required
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
                />
                <span>J’utilise Encair dans le cadre de mon activité professionnelle.</span>
              </label>
            </div>

            <SubmitButton />
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
              Se connecter
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
