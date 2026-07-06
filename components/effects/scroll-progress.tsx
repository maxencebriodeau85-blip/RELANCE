'use client'

import { useEffect, useRef } from 'react'

// Fixed top progress bar tracking scroll position — a signature touch on
// flagship product sites (Linear, Vercel docs). Pure transform/width update
// via a single rAF-throttled passive scroll listener; no re-renders.
// Skipped entirely under prefers-reduced-motion (scroll-linked motion).
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let ticking = false
    function update() {
      const doc = document.documentElement
      const scrollTop = doc.scrollTop
      const scrollHeight = doc.scrollHeight - doc.clientHeight
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      if (barRef.current) barRef.current.style.width = `${pct}%`
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

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none" aria-hidden="true">
      <div
        ref={barRef}
        className="h-full bg-brand-gradient shadow-[0_0_10px_rgba(107,140,255,0.55)]"
        style={{ width: '0%' }}
      />
    </div>
  )
}
