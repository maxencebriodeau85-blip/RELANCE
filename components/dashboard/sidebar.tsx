'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  LayoutDashboard,
  FileText,
  Bell,
  AlertTriangle,
  Settings,
  LogOut,
  Clock,
  HelpCircle,
  Mail,
  ChevronRight,
  BarChart3,
  Plug,
  Users,
  X,
  Search,
  Menu,
} from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'

const navGroups = [
  {
    label: 'Suivi',
    items: [
      { href: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
      { href: '/dashboard/today', label: 'À faire aujourd’hui', icon: Clock },
      { href: '/dashboard/clients', label: 'Mes clients', icon: Users },
      { href: '/dashboard/invoices', label: 'Mes impayés', icon: FileText },
    ],
  },
  {
    label: 'Relances',
    items: [
      { href: '/dashboard/scenarios', label: 'Scénarios', icon: Bell },
      { href: '/dashboard/templates', label: 'Modèles email', icon: Mail },
      { href: '/dashboard/operations', label: 'État des relances', icon: AlertTriangle },
    ],
  },
  {
    label: 'Espace',
    items: [
      { href: '/dashboard/stats', label: 'Statistiques', icon: BarChart3 },
      { href: '/dashboard/integrations', label: 'Connexions', icon: Plug },
      { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
    ],
  },
]

const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Essai gratuit',
  starter: 'Fondateur',
  pro: 'Pro',
  business: 'Business',
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function SidebarContent({
  profile,
  email,
  pathname,
  onClose,
}: {
  profile: Profile | null
  email: string
  pathname: string
  onClose?: () => void
}) {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const initials = (profile?.company_name || email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const trialDaysLeft =
    profile?.plan === 'free_trial' && profile?.trial_ends_at
      ? daysUntil(profile.trial_ends_at)
      : null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fcfbf8]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e8e6e0] px-5">
        <Logo
          href="/dashboard"
          size="sm"
          className="hover:opacity-80 transition-opacity"
        />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#526171] hover:bg-[#efede8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#182b40]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ⌘K hint — opens the command palette */}
      <button
        onClick={() => {
          onClose?.()
          window.setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
          }, 0)
        }}
        className="group mx-3 mt-4 flex min-h-10 items-center justify-between rounded-lg border border-[#e5e4df] bg-white px-3 text-sm text-[#526171] transition-colors hover:border-[#b9c1c9] hover:bg-[#f8f8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#182b40]"
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          Rechercher…
        </span>
        <kbd className="flex items-center gap-0.5 font-mono text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">
          <span className="bg-white border border-gray-200 rounded px-1 py-0.5">
            ⌘
          </span>
          <span className="bg-white border border-gray-200 rounded px-1 py-0.5">
            K
          </span>
        </kbd>
      </button>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.13em] text-[#788491]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#182b40]',
                      isActive
                        ? 'bg-[#182b40] text-white'
                        : 'text-[#4d5c6c] hover:bg-[#efeee9] hover:text-[#182b40]',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[#ef9d7c]' : 'text-[#768493]')} aria-hidden="true" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Trial banner */}
      {trialDaysLeft !== null && (
        <div className="mx-3 mb-3 rounded-xl border border-[#ead8c4] bg-[#fbf3e9] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-900">
              Essai · {trialDaysLeft}j restant{trialDaysLeft > 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className="flex items-center justify-between min-h-9 rounded-md bg-[#182b40] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#294059]"
          >
            Activer mon tarif fondateur
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Help */}
      <Link
        href="/contact"
        onClick={onClose}
        className="mx-2 mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Aide & support
      </Link>

      {/* User */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#182b40] text-white text-xs font-bold">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-900 truncate">
              {profile?.company_name || 'Mon entreprise'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {PLAN_LABELS[profile?.plan || 'free_trial']}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data as Profile)
    })
  }, [])

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[#e8e6e0] md:flex">
      <SidebarContent profile={profile} email={email} pathname={pathname} />
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data as Profile)
    })
  }, [])

  // Close the drawer when navigating or switching to the desktop layout.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[#34495c] hover:bg-[#efeee9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#182b40] md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#102235]/45 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[60] w-[min(19rem,85vw)] bg-[#fcfbf8] shadow-2xl focus:outline-none md:hidden"
        >
          <Dialog.Title className="sr-only">Menu de navigation</Dialog.Title>
          <SidebarContent profile={profile} email={email} pathname={pathname} onClose={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
