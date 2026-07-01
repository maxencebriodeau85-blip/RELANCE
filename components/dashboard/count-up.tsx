'use client'

import { useEffect, useRef, useState } from 'react'
import { formatEuro } from '@/lib/metrics'

interface CountUpProps {
  value: number
  format?: 'euro' | 'int' | 'days' | 'percent'
  /** DA: animations < 400ms */
  duration?: number
  className?: string
}

function render(value: number, format: CountUpProps['format']): string {
  switch (format) {
    case 'euro':
      return formatEuro(value)
    case 'days':
      return `${Math.round(value)}j`
    case 'percent':
      return `${Math.round(value)}%`
    default:
      return Math.round(value).toLocaleString('fr-FR')
  }
}

// KPI numbers count up from 0 on mount instead of appearing statically.
// Ease-out cubic; skipped entirely under prefers-reduced-motion.
export function CountUp({ value, format = 'int', duration = 400, className }: CountUpProps) {
  const [shown, setShown] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || value === 0) {
      setShown(value)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(value * eased)
      if (t < 1) requestAnimationFrame(tick)
      else setShown(value)
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return <span className={className}>{render(shown, format)}</span>
}
