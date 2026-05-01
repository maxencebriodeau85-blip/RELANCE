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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/database.types'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/invoices', label: 'Factures', icon: FileText },
  { href: '/dashboard/scenarios', label: 'Scénarios', icon: Bell },
  { href: '/dashboard/mise-en-demeure', label: 'Mise en demeure', icon: AlertTriangle },
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
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
    <aside className="flex h-full w-60 flex-col border-r bg-white">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-2.5 border-b px-5 hover:bg-gray-50 transition-colors flex-shrink-0"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-gray-900 tracking-tight">RelanceFlow</span>
      </Link>

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
    </aside>
  )
}
