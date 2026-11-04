'use client'
import { useEffect } from 'react'
import { trackTrialClick } from '@/lib/trial-attribution'
export function ActivationClicks() {
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (anchor) trackTrialClick(anchor.getAttribute('href') || '', window.location.pathname, window.location.origin)
    }
    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [])
  return null
}
