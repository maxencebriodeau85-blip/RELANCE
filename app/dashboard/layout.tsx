import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, MobileNav } from '@/components/dashboard/sidebar'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { Zap } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at')
    .eq('id', user.id)
    .single()

  if (
    profile?.plan === 'free_trial' &&
    profile.trial_ends_at &&
    new Date(profile.trial_ends_at) < new Date()
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
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">RelanceFlow</span>
            </Link>
          </div>
          {/* Desktop spacer */}
          <div className="hidden md:block" />
          {/* Right: notification bell */}
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
