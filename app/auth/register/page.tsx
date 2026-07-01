'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { registerAction } from './actions'
import {
  Eye, EyeOff, AlertCircle, CheckCircle,
  Kanban, Bell, FileText, Loader2,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'

const sideFeatures = [
  { icon: Kanban, label: 'Pipeline kanban', sub: 'Tous tes deals en un coup d\'œil' },
  { icon: Bell, label: 'Relances automatiques', sub: 'Prospects et factures — sans intervention' },
  { icon: FileText, label: 'Facturation intégrée', sub: 'De la proposition signée à l\'encaissement' },
]

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
        'Créer mon compte gratuit'
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

function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-5/12 flex-col justify-between bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 p-10 relative overflow-hidden">
      <div className="brand-orb bg-brand-500/40 h-[300px] w-[300px] -top-20 -left-20" />
      <div className="brand-orb bg-fuchsia-500/30 h-[400px] w-[400px] bottom-0 -right-40" />
      <div className="relative">
        <Logo variant="mono-white" size="md" />
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-white leading-tight tracking-tight">
            Arrête de courir après ton argent.
          </h2>
          <p className="text-white/70 mt-3 text-sm leading-relaxed">
            Relances automatiques, mise en demeure légale, paiement Stripe intégré —
            le logiciel français pour indépendants qui bossent seuls.
          </p>
        </div>

        <div className="space-y-4">
          {sideFeatures.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-blue-300/60">{f.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-blue-100/80 italic leading-relaxed">
            &quot;La facture part toute seule depuis le deal signé. Et si pas payée, la relance aussi. J&apos;ai récupéré 8 000 € en deux semaines.&quot;
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">L</div>
            <div>
              <p className="text-xs font-semibold text-white">Lucie M.</p>
              <p className="text-xs text-blue-300/60">Coach certifiée — Lyon</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-blue-300/40">
        Données hébergées en Europe · Conforme RGPD · 15 €/mois après l&apos;essai
      </p>
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
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-6 bg-white">
          <div className="w-full max-w-sm text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vérifie ton email</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Un email de confirmation a été envoyé à{' '}
                <strong className="text-gray-800">{state.email}</strong>. Clique sur le lien pour activer ton compte.
              </p>
              <p className="text-gray-400 mt-2 text-xs">
                Pense à vérifier tes spams si tu ne le vois pas dans les 2 minutes.
              </p>
            </div>
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
      <LeftPanel />

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="sm" />
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Ton essai gratuit t&apos;attend ✨</h1>
            <p className="text-gray-500 mt-1 text-sm">30 jours · Sans carte bancaire · Annulable à tout moment</p>
          </div>

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
                placeholder="Jean Martin Conseil"
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
                placeholder="toi@exemple.fr"
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
                  autoComplete="new-password"
                  className="h-11 pr-10"
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

            <p className="text-xs text-gray-400">
              En créant un compte, tu acceptes nos{' '}
              <Link href="/cgu" className="underline text-blue-600">CGU</Link>{' '}
              et notre{' '}
              <Link href="/privacy" className="underline text-blue-600">politique de confidentialité</Link>.
            </p>

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
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />RGPD</span>
          </div>
        </div>
      </div>
    </div>
  )
}
