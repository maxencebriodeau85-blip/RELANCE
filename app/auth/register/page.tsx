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
      className="w-full h-11 rounded-lg bg-[#182b40] disabled:opacity-60 text-white font-semibold text-sm transition-colors hover:bg-[#294059] flex items-center justify-center gap-2"
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

  const labels = ['Faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
  const colors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-brand-500', 'bg-green-500']

  return (
    <div id="password-strength" className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${strength >= level ? colors[strength] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">Force : {labels[strength]}</p>
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
      <main id="main-content" className="rf-auth-shell">
        <AuthSidePanel compact />
        <div className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vérifiez votre email</h1>
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
              className="inline-block w-full h-11 rounded-lg bg-[#182b40] hover:bg-[#294059] text-white font-semibold text-sm transition-colors leading-[44px]"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="rf-auth-shell">
      <AuthSidePanel />

      <div className="flex min-w-0 flex-1 items-start justify-center px-5 py-7 sm:p-8 lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-6 lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="mb-6">
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
                autoComplete="organization"
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
                  aria-describedby={password ? "password-strength" : undefined}
                  className="h-11 pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                aria-invalid={Boolean(confirmPassword && password !== confirmPassword)}
                aria-describedby={confirmPassword && password !== confirmPassword ? "password-mismatch" : undefined}
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && password !== confirmPassword && (
                <p id="password-mismatch" className="text-xs text-red-700">Les mots de passe ne correspondent pas</p>
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
                  <Link href="/cgu" target="_blank" rel="noopener noreferrer" className="underline text-[#a64829]">conditions générales (CGU/CGV)</Link>{' '}
                  et l’<Link href="/dpa" target="_blank" rel="noopener noreferrer" className="underline text-[#a64829]">accord de sous-traitance</Link>, et je reconnais
                  avoir pris connaissance de la{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-[#a64829]">politique de confidentialité</Link>. <span className="text-gray-500">Ces liens s’ouvrent dans un nouvel onglet.</span>
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
            <Link href="/auth/login" className="font-semibold text-[#a64829] hover:underline">
              Se connecter
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
