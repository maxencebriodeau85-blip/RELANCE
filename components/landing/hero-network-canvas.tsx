'use client'

import { useEffect, useRef } from 'react'

// Animated constellation network for the hero background.
// - Nodes drift slowly and connect with lines when close enough.
// - Cursor gently attracts nearby nodes (desktop only, subtle).
// - Colors match the existing brand gradient (indigo / fuchsia / amber).
// - Fully paused + replaced by a static frame under prefers-reduced-motion,
//   consistent with the rest of the DA (see app/globals.css).
export function HeroNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const COLORS = [
      'rgba(129,140,248,ALPHA)', // brand / indigo
      'rgba(232,121,249,ALPHA)', // fuchsia
      'rgba(251,191,36,ALPHA)', // amber
    ]

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let nodes: {
      x: number
      y: number
      vx: number
      vy: number
      r: number
      color: string
    }[] = []
    const mouse = { x: -9999, y: -9999, active: false }

    function resize() {
      const parent = canvas!.parentElement
      if (!parent) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const density = Math.min(70, Math.floor((width * height) / 16000))
      nodes = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }))
    }

    function drawStatic() {
      resize()
      ctx!.clearRect(0, 0, width, height)
      for (const n of nodes) {
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx!.fillStyle = n.color.replace('ALPHA', '0.5')
        ctx!.fill()
      }
    }

    function step() {
      ctx!.clearRect(0, 0, width, height)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy

        if (mouse.active) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < 22000) {
            n.x -= dx * 0.0018
            n.y -= dy * 0.0018
          }
        }

        if (n.x < -20) n.x = width + 20
        if (n.x > width + 20) n.x = -20
        if (n.y < -20) n.y = height + 20
        if (n.y > height + 20) n.y = -20
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 130
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.35
            ctx!.beginPath()
            ctx!.strokeStyle = `rgba(255,255,255,${alpha})`
            ctx!.lineWidth = 1
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }

      for (const n of nodes) {
        ctx!.beginPath()
        ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx!.fillStyle = n.color.replace('ALPHA', '0.85')
        ctx!.fill()
      }

      raf = requestAnimationFrame(step)
    }

    resize()

    if (reduceMotion) {
      drawStatic()
    } else {
      raf = requestAnimationFrame(step)
    }

    function handleResize() {
      if (reduceMotion) {
        drawStatic()
      } else {
        resize()
      }
    }
    function handlePointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }
    function handlePointerLeave() {
      mouse.active = false
    }

    window.addEventListener('resize', handleResize)
    if (!reduceMotion) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerleave', handlePointerLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
    />
  )
}
