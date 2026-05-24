'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Bell,
  AlertTriangle,
  Settings,
  LogOut,
  Zap,
  Clock,
  HelpCircle,
  ChevronRight,
  BarChart3,
  Plug,
  Kanban,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/dashboard/invoices', label: 'Factures', icon: FileText },
  { href: '/dashboard/scenarios', label: 'Scénarios', icon: Bell },
  { href: '/dashboard/mise-en-demeure', label: 'Mise en demeure', icon: AlertTriangle },
  { href: '/dashboard/integrations', label: 'Intégrations', icon: Plug },
  { href: '/dashboard/stats', label: 'Statistiques', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
]

const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Essai gratuit',
  starter: 'Starter',
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
  const router = useRouter()

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
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b px-5 flex-shrink-0">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">RelanceFlow</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Trial banner */}
      {trialDaysLeft !== null && (
        <div className="mx-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-900">
              Essai · {trialDaysLeft}j restant{trialDaysLeft > 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            onClick={onClose}
            className="flex items-center justify-between rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-2.5 py-1.5 transition-colors"
          >
            Choisir un plan
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Help */}
      <Link
        href="/support"
        onClick={onClose}
        className="mx-2 mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Aide & support
      </Link>

      {/* User */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-900 truncate">
              {profile?.company_name || 'Mon entreprise'}
            </div>
            <div className="text-xs text-gray-400 truncate">
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
    <aside className="hidden md:flex h-full w-60 flex-col border-r flex-shrink-0">
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
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data as Profile)
    })
  }, [])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Ouvrir le menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent
          profile={profile}
          email={email}
          pathname={pathname}
          onClose={() => setOpen(false)}
        />
      </div>
    </>
  )
}
