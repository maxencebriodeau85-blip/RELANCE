'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Zap, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, Kanban, FileText, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { supabaseAuthError } from '@/lib/auth-errors'

const sideFeatures = [
  { icon: Kanban, label: 'Pipeline kanban', sub: 'Tous tes deals en un coup d\'œil' },
  { icon: Bell, label: 'Relances automatiques', sub: 'Prospects et factures — sans intervention' },
  { icon: FileText, label: 'Facturation intégrée', sub: 'De la proposition signée à l\'encaissement' },
]

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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(supabaseAuthError(signInError.message, signInError.status))
        setLoading(false)
        return
      }

      window.location.href = redirectTo
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 p-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">RelanceFlow</span>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Ne laisse plus aucun deal mourir en silence.
            </h2>
            <p className="text-blue-300/70 mt-3 text-sm leading-relaxed">
              Pipeline, relances automatiques et facturation intégrée —
              pour consultants et coaches indépendants.
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

          {/* Testimonial */}
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

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bon retour 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Connecte-toi à ton espace RelanceFlow</p>
          </div>

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
                placeholder="toi@exemple.fr"
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
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
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
              Essai gratuit 14 jours
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
