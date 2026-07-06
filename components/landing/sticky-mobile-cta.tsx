'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const CONSENT_KEY = 'rf_cookie_consent_v1'

function hasConsentDecision(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CONSENT_KEY) !== null
  } catch {
    return false
  }
}

// Sticky mobile-only CTA bar — appears once the visitor has scrolled past the
// hero (its own CTA is already out of view) and never at the same time as the
// cookie banner, which is also fixed to the bottom on mobile. Showing both
// at once is exactly the overlap that once made the login button unclickable
// on short screens — this component is deliberately built to never repeat it:
// it only renders once a cookie consent decision has been made (accepted or
// rejected), and re-checks the instant that decision happens via the
// 'rf-cookie-consent-changed' event dispatched by <CookieBanner>.
export function StickyMobileCta() {
  const [consented, setConsented] = useState(false)
  const [inRange, setInRange] = useState(false)

  useEffect(() => {
    setConsented(hasConsentDecision())
    const onConsent = () => setConsented(true)
    window.addEventListener('rf-cookie-consent-changed', onConsent)
    return () => window.removeEventListener('rf-cookie-consent-changed', onConsent)
  }, [])

  useEffect(() => {
    let ticking = false
    function update() {
      const doc = document.documentElement
      const pastHero = window.scrollY > window.innerHeight * 0.9
      // Hide before reaching the footer — a fixed bar must never sit on top
      // of the legally-required footer links (mentions légales, CGU…).
      const distanceFromBottom = doc.scrollHeight - (window.scrollY + window.innerHeight)
      const nearFooter = distanceFromBottom < 700
      setInRange(pastHero && !nearFooter)
      ticking = false
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  if (!consented || !inRange) return null

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent">
      <Link
        href="/auth/register"
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-bold py-3.5 text-sm shadow-xl shadow-brand-500/30"
      >
        Essai gratuit 30 jours — Sans CB
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
