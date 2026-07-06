'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  /** Max rotation in degrees at the edge of the card. */
  maxTilt?: number
}

// 3D perspective tilt following the cursor — the hero product-visual
// signature on Linear, Framer, Vercel. transform-only (perspective + rotate),
// GPU-composited. Skipped on touch input and under prefers-reduced-motion.
export function TiltCard({ children, className, maxTilt = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    function onMove(e: PointerEvent) {
      const rect = node!.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const rotateY = (px - 0.5) * 2 * maxTilt
      const rotateX = (0.5 - py) * 2 * maxTilt
      node!.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    }
    function onLeave() {
      node!.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    }

    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [maxTilt])

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  )
}
