'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/brand/logo'
import { consumeAuthLink } from '@/lib/auth-link'
import { supabaseAuthError } from '@/lib/auth-errors'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

type Mode = 'loading' | 'form' | 'error'

export default function ResetPasswordPage() {
  const [mode, setMode] = useState<Mode>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    async function prepare() {
      try {
        const supabase = createClient()
        const url = new URL(window.location.href)
        if (url.search || url.hash) {
          await consumeAuthLink(supabase, url)
          window.history.replaceState(null, '', '/auth/reset-password')
        }
        const { data: { user }, error } = await supabase.auth.getUser()
        setMode(user && !error ? 'form' : 'error')
      } catch { setMode('error') }
    }
    void prepare()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password })
      if (updateError) throw new Error(supabaseAuthError(updateError.message, updateError.status))
      window.location.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La modification a échoué. Réessayez.')
    } finally { setLoading(false) }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500">Vérification du lien…</p>
        </div>
      </div>
    )
  }

  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Lien expiré ou invalide</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Ce lien de réinitialisation n&apos;est plus valide. Demandez un nouveau lien pour continuer.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Demander un nouveau lien</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 pb-28 sm:pb-4 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo size="md" />
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Nouveau mot de passe</CardTitle>
            <CardDescription>
              Choisissez un nouveau mot de passe pour votre compte
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
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
