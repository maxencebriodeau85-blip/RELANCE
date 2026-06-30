'use client'

import { useState, useEffect } from 'react'
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

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lock body scroll when menu open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo size="sm" />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-gray-900 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
          >
            Essai gratuit 30j
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden absolute inset-x-0 top-full bg-white border-b shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
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
                className="block text-center rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2.5"
              >
                Essai gratuit 30j
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
