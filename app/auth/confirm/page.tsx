'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, AlertCircle, CheckCircle } from 'lucide-react'
import type { EmailOtpType } from '@supabase/supabase-js'

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

    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/dashboard'

    const supabase = createClient()

    async function verify() {
      // ── 1. PKCE code ──────────────────────────────────────────────────────
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          setStatus('success')
          // Fire-and-forget — never block redirect on welcome email
          fetch('/api/profile/welcome', { method: 'POST' }).catch(() => null)
          window.location.href = next
          return
        }
        // The PKCE code_verifier lives in a cookie set on the device/browser
        // where signup happened. Opening the email link in a different
        // context (an in-app mail browser, another device) means that cookie
        // is missing and the exchange fails HERE even though the email was
        // already confirmed server-side. Before declaring an error, check
        // whether a session already exists (e.g. a previous attempt in this
        // same browser succeeded) — if so, just proceed instead of blocking
        // the user on a false "invalid link".
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus('success')
          window.location.href = next
          return
        }
        setErrorMsg("Ce lien n'a pas pu être validé sur cet appareil ou ce navigateur.")
        setStatus('error')
        return
      }

      // ── 2. OTP / token_hash ───────────────────────────────────────────────
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!error) {
          setStatus('success')
          // Fire-and-forget — never block redirect on welcome email
          fetch('/api/profile/welcome', { method: 'POST' }).catch(() => null)
          window.location.href = next
          return
        }
        setErrorMsg('Ce lien est invalide ou a expiré.')
        setStatus('error')
        return
      }

      // ── 3. Implicit / hash fragment ───────────────────────────────────────
      // window.location.hash is never sent to the server — must be read here.
      const hash = window.location.hash.slice(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            setStatus('success')
            window.location.href = next
            return
          }
          setErrorMsg('Session invalide. Veuillez demander un nouveau lien.')
          setStatus('error')
          return
        }
      }

      // ── Nothing found ─────────────────────────────────────────────────────
      setErrorMsg('Lien de confirmation invalide ou expiré. Demandez-en un nouveau.')
      setStatus('error')
    }

    verify()
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
          {/* This most often means the email was already confirmed on Supabase's
              side (verified server-side) but the browser that opened the link
              (e.g. an in-app mail browser) doesn't have the cookies from the
              device where the account was created — the PKCE code exchange
              then fails locally even though confirmation succeeded. Steering
              to login first avoids the dead end of "email already registered"
              that "Créer un nouveau compte" used to cause here. */}
          <p className="text-xs text-gray-400 mt-2">
            Ton adresse est probablement déjà validée. Essaie de te connecter directement —
            si ça ne fonctionne pas, redemande un lien depuis la page de connexion.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="block w-full py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold hover:shadow-md transition-all"
        >
          Se connecter
        </Link>
        <Link href="/auth/register" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Créer un nouveau compte
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
      <div className="flex items-center gap-2.5 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">RelanceFlow</span>
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
