'use client'

import { useEffect, useRef } from 'react'

const ORBS = [
  { className: 'bg-brand-500/40 h-[340px] w-[340px] -top-20 -left-32', speed: 0.12 },
  { className: 'bg-fuchsia-500/30 h-[420px] w-[420px] top-10 -right-40', speed: 0.2 },
  { className: 'bg-amber-400/20 h-[260px] w-[260px] bottom-0 left-1/3', speed: 0.08 },
]

// Scroll-linked parallax on the hero's decorative blur orbs — a depth cue
// used across premium SaaS heroes. transform3d-only, rAF-throttled passive
// scroll listener. No-op under prefers-reduced-motion (orbs stay put, still
// visible — this is a depth effect, not essential motion).
export function ParallaxOrbs() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let ticking = false
    function update() {
      const y = window.scrollY
      refs.current.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(0, ${y * ORBS[i].speed}px, 0)`
      })
      ticking = false
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {ORBS.map((orb, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className={`brand-orb ${orb.className}`}
        />
      ))}
    </>
  )
}
