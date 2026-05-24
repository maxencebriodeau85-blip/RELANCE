'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { supabaseAuthError } from '@/lib/auth-errors'
import { Zap, AlertCircle, CheckCircle, ArrowLeft, Clock } from 'lucide-react'

const COUNTDOWN_SECONDS = 8
const RATE_LIMIT_SECONDS = 60

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0)
  const lastSentAt = useRef<number | null>(null)

  useEffect(() => {
    if (!sent) return
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push('/auth/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [sent, router])

  useEffect(() => {
    if (rateLimitRemaining <= 0) return
    const interval = setInterval(() => {
      setRateLimitRemaining((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [rateLimitRemaining])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lastSentAt.current && Date.now() - lastSentAt.current < RATE_LIMIT_SECONDS * 1000) {
      const remaining = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (Date.now() - lastSentAt.current)) / 1000)
      setRateLimitRemaining(remaining)
      setError(`Merci de patienter ${remaining}s avant de renvoyer un email.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/reset-password`,
      })

      if (resetError) {
        setError(supabaseAuthError(resetError.message, resetError.status))
        return
      }

      lastSentAt.current = Date.now()
      setCountdown(COUNTDOWN_SECONDS)
      setSent(true)
    } catch {
      setError('Une erreur inattendue est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
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

        {sent ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Email envoyé</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception (et vos spams).
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                Redirection automatique dans {countdown}s…
              </div>
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Mot de passe oublié</CardTitle>
              <CardDescription>
                Entrez votre email pour recevoir un lien de réinitialisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@entreprise.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || rateLimitRemaining > 0}>
                  {loading
                    ? 'Envoi en cours...'
                    : rateLimitRemaining > 0
                    ? `Réessayer dans ${rateLimitRemaining}s`
                    : 'Envoyer le lien de réinitialisation'}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <Link
                href="/auth/login"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
