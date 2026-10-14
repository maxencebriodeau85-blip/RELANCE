'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { consumeAuthLink } from '@/lib/auth-link'

// Handles all three Supabase email-confirmation token formats:
//  1. PKCE      → ?code=xxx               (exchangeCodeForSession)
//  2. OTP       → ?token_hash=xxx&type=xxx (verifyOtp)
//  3. Implicit  → #access_token=xxx&…     (setSession from hash — never sent to server)

type Status = 'loading' | 'success' | 'error'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    // Strict-mode double-invoke guard
    if (ran.current) return
    ran.current = true

    async function verify() {
      try {
        const destination = await consumeAuthLink(createClient(), new URL(window.location.href))
        window.history.replaceState(null, '', '/auth/confirm')
        setStatus('success')
        window.location.replace(destination)
      } catch (error) {
        window.history.replaceState(null, '', '/auth/confirm')
        setErrorMsg(error instanceof Error ? error.message : 'La connexion est indisponible. Réessayez.')
        setStatus('error')
      }
    }
    void verify()
  }, [searchParams])

  if (status === 'success') {
    return (
      <div className="text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm text-gray-600">Adresse vérifiée — redirection…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
        <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Le lien n&apos;a pas pu être validé ici</h2>
          <p className="text-sm text-gray-500 mt-1">{errorMsg}</p>
          <p className="text-xs text-gray-500 mt-2">
            Si vous avez déjà validé votre adresse, connectez-vous. Sinon, demandez un nouveau lien.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="block w-full py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:shadow-md transition-all"
        >
          Se connecter
        </Link>
        <Link href="/auth/resend" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Renvoyer le lien de confirmation
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center space-y-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
      <p className="text-sm text-blue-200">Vérification de votre adresse email…</p>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="mb-10">
        <Logo variant="mono-white" size="md" />
      </div>

      <Suspense
        fallback={
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
            <p className="text-sm text-blue-200">Chargement…</p>
          </div>
        }
      >
        <ConfirmContent />
      </Suspense>
    </div>
  )
}
