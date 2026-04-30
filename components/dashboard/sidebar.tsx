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
    router.push('/auth/login')
    router.refresh()
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
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2 border-b px-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="mx-3 mb-3 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-blue-900">
              Essai gratuit · {trialDaysLeft}j restant{trialDaysLeft > 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="block w-full text-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 transition-colors"
          >
            Choisir un plan
          </Link>
        </div>
      )}

      {/* Help link */}
      <Link
        href="/support"
        className="mx-3 mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
        Aide & support
      </Link>

      {/* User section */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold flex-shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {profile?.company_name || 'Mon entreprise'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {PLAN_LABELS[profile?.plan || 'free_trial']} · {email || '...'}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
