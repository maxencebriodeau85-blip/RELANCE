'use client'

import { useState, useEffect, useRef } from 'react'
import { CTA_LABEL } from '@/lib/plans'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/logo'

const LINKS = [
  { href: '/#produit', label: 'Produit' },
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#pricing', label: 'Tarifs' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/guides', label: 'Guides' },
  { href: '/about', label: 'À propos' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)

  // Keep a visible separator once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Escape closes the mobile navigation.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuTrigger.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // This is a disclosure, not a modal: keep the page scrollable and dismiss
  // the menu when someone interacts outside the navigation.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navigation.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <nav ref={navigation} aria-label="Navigation principale" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
      scrolled
        ? 'border-[#e1ded7] bg-[#f7f4ed]'
        : 'border-transparent bg-[#f7f4ed]'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo size="sm" />

        {/* Desktop links */}
        <div className="hidden xl:flex items-center gap-5 text-sm text-gray-600">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gray-900 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden xl:flex items-center gap-2">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 transition-colors"
          >
            Se connecter
          </Link>
          <Link
              href="/auth/register"
              className="rounded-lg bg-[#182b40] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#294059] transition-colors"
            >
              {CTA_LABEL}
          </Link>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <Link href="/auth/register" aria-label={CTA_LABEL} className="inline-flex min-h-10 items-center rounded-lg bg-[#182b40] px-3 text-sm font-semibold text-white hover:bg-[#294059]">
            Essayer<span className="hidden sm:inline">&nbsp;gratuitement</span>
          </Link>
        {/* Mobile menu trigger */}
        <button
          type="button"
          ref={menuTrigger}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls={open ? "mobile-navigation" : undefined}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div id="mobile-navigation" className="xl:hidden absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white border-b shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Se connecter
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="block text-center rounded-lg bg-[#182b40] text-white text-sm font-semibold px-4 py-2.5"
              >
                {CTA_LABEL}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
