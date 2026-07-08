import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, MobileNav } from '@/components/dashboard/sidebar'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { Logo } from '@/components/brand/logo'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not /auth/login directly — see app/auth/clear-session/route.ts for why
  // an invalid session must be cleared via a Route Handler, not a redirect
  // straight out of this Server Component.
  if (!user) redirect('/auth/clear-session')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single()

  // Fail-closed: a free_trial with no trial_ends_at (legacy row, or a
  // cancelled subscription reverted to free_trial) is treated as expired.
  if (
    profile?.plan === 'free_trial' &&
    (!profile.trial_ends_at || new Date(profile.trial_ends_at) < new Date())
  ) {
    redirect('/subscription')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — mobile: hamburger + logo + bell | desktop: bell only */}
        <div className="flex h-14 items-center justify-between border-b bg-white px-4 flex-shrink-0">
          {/* Mobile left */}
          <div className="flex items-center gap-3 md:hidden">
            <MobileNav />
            <Logo href="/dashboard" size="sm" />
          </div>
          {/* Desktop spacer */}
          <div className="hidden md:block" />
          {/* Right: notification bell */}
          <NotificationBell />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette />
    </div>
  )
}
