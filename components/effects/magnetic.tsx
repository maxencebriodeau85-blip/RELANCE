'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface MagneticProps {
  children: React.ReactNode
  strength?: number
  className?: string
}

// Subtle magnetic pull toward the cursor within the element's bounds — the
// signature micro-interaction on flagship SaaS CTAs (Linear, Stripe, Vercel).
// Transform-only (GPU-cheap). Skipped on touch input and under
// prefers-reduced-motion.
export function Magnetic({ children, strength = 0.25, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    function onMove(e: PointerEvent) {
      const rect = node!.getBoundingClientRect()
      const relX = e.clientX - (rect.left + rect.width / 2)
      const relY = e.clientY - (rect.top + rect.height / 2)
      node!.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`
    }
    function onLeave() {
      node!.style.transform = 'translate(0, 0)'
    }

    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [strength])

  return (
    <div ref={ref} className={cn('inline-block transition-transform duration-200 ease-out will-change-transform', className)}>
      {children}
    </div>
  )
}
