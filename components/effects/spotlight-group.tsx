'use client'

import { useEffect, useRef } from 'react'

interface SpotlightGroupProps {
  children: React.ReactNode
  className?: string
}

// Cursor-follow glow on `.card-spotlight` descendants — ONE pointermove
// listener for the whole grid (not per-card), driving CSS custom properties
// only (--x/--y consumed by the .card-spotlight::before radial-gradient in
// globals.css). Signature touch on Linear/Vercel/Stripe dashboards.
// No-op under prefers-reduced-motion — cards keep their static premium look.
export function SpotlightGroup({ children, className }: SpotlightGroupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    function onMove(e: PointerEvent) {
      const target = (e.target as HTMLElement)?.closest('.card-spotlight') as HTMLElement | null
      if (!target) return
      const rect = target.getBoundingClientRect()
      target.style.setProperty('--x', `${e.clientX - rect.left}px`)
      target.style.setProperty('--y', `${e.clientY - rect.top}px`)
    }

    node.addEventListener('pointermove', onMove)
    return () => node.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
