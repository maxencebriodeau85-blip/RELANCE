'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'rf_cookie_consent_v1'

type Consent = 'accepted' | 'rejected' | null

function readConsent(): Consent {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'accepted' || v === 'rejected') return v
  } catch {
    // localStorage blocked
  }
  return null
}

function writeConsent(v: Exclude<Consent, null>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, v)
  } catch {
    // fallthrough
  }
}

export function CookieBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (readConsent() === null) setOpen(true)
  }, [])

  if (!open) return null

  const accept = () => {
    writeConsent('accepted')
    setOpen(false)
  }
  const reject = () => {
    writeConsent('rejected')
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Préférences cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-5 relative">
        <button
          onClick={reject}
          aria-label="Refuser et fermer"
          className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Cookie className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Cookies &amp; vie privée</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Nous utilisons des cookies strictement nécessaires au fonctionnement
              de l&apos;application. Les cookies de mesure d&apos;audience sont optionnels et
              ne sont chargés qu&apos;avec votre accord.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            onClick={accept}
            className="flex-1 rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2 transition-all hover:shadow-md"
          >
            Tout accepter
          </button>
          <button
            onClick={reject}
            className="flex-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2 transition-colors"
          >
            Refuser
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          <Link href="/privacy" className="hover:text-gray-700 underline underline-offset-2">
            Politique de confidentialité
          </Link>
          {' · '}
          <Link href="/mentions-legales" className="hover:text-gray-700 underline underline-offset-2">
            Mentions légales
          </Link>
        </p>
      </div>
    </div>
  )
}
