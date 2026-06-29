'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedStatProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

// Count-up animation triggered when the element enters the viewport.
// Falls back to the final value for users with reduced-motion preference.
export function AnimatedStat({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1200,
  className,
}: AnimatedStatProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const start = performance.now()
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration)
              // ease-out cubic
              const eased = 1 - Math.pow(1 - t, 3)
              setShown(value * eased)
              if (t < 1) requestAnimationFrame(tick)
              else setShown(value)
            }
            requestAnimationFrame(tick)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [value, duration])

  const formatted = decimals > 0
    ? shown.toFixed(decimals).replace('.', ',')
    : Math.round(shown).toLocaleString('fr-FR')

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
