'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'

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
  // Lets other fixed-bottom UI (e.g. the mobile sticky CTA bar) know it's now
  // safe to appear — never show alongside this banner, same "one thing fixed
  // to the bottom at a time" rule that fixed the login-button overlap bug.
  window.dispatchEvent(new Event('rf-cookie-consent-changed'))
}

export function CookieBanner() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (readConsent() === null) setOpen(true)
  }, [])

  // Informational notice stays in the document flow on account forms so it
  // cannot cover the submit button or a recovery link on small screens.
  if (pathname.startsWith('/auth/')) return <aside aria-label="Cookies" className="border-t bg-white px-6 py-4 text-center text-xs text-gray-500">
    Un cookie de session est nécessaire à votre connexion.{' '}
    <Link href="/privacy" className="underline">Confidentialité</Link>{' · '}
    <Link href="/mentions-legales" className="underline">Mentions légales</Link>
  </aside>
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
    <aside
      aria-live="polite"
      aria-label="Cookies et vie privée"
      className="fixed bottom-3 left-3 right-3 z-[60] mx-auto max-w-4xl rounded-xl border border-[#dce0e2] bg-white p-4 shadow-lg sm:flex sm:items-center sm:gap-5"
    >
      <div className="min-w-0 pr-8 sm:flex-1 sm:pr-0">
        <p className="text-xs leading-relaxed text-[#526171]">
          Encair n&apos;utilise qu&apos;un cookie nécessaire à la connexion. La mesure
          d&apos;audience fonctionne sans cookie et sans données personnelles.
        </p>
        <p className="mt-1.5 text-[11px] text-[#526171]">
          <Link href="/privacy" className="underline underline-offset-2">Politique de confidentialité</Link>
          {' · '}
          <Link href="/mentions-legales" className="underline underline-offset-2">Mentions légales</Link>
        </p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 sm:mt-0 sm:shrink-0">
        <button type="button" onClick={accept} className="min-h-10 rounded-lg bg-[#182b40] px-4 text-sm font-semibold text-white hover:bg-[#294059]">
          Compris
        </button>
        <button type="button" onClick={reject} aria-label="Fermer l’information sur les cookies" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-lg text-[#526171] hover:bg-gray-100 sm:static">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
