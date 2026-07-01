'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: React.ReactNode
  /** Extra delay in ms before the reveal starts (for stagger effects) */
  delay?: number
  className?: string
}

// Fade-in + translateY on first viewport entry. Fires ONCE (no replay on
// scroll-back, per DA). Under prefers-reduced-motion the content is simply
// visible (handled in globals.css).
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => setVisible(true), delay)
            } else {
              setVisible(true)
            }
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={cn(visible ? 'reveal-visible' : 'reveal-hidden', className)}>
      {children}
    </div>
  )
}
