import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, MobileNav } from '@/components/dashboard/sidebar'
import { NotificationBell } from '@/components/dashboard/notification-bell'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { Logo } from '@/components/brand/logo'
import { PaymentFailedBanner } from '@/components/dashboard/payment-failed-banner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Not /auth/login directly — see app/auth/clear-session/route.ts for why
  // an invalid session must be cleared via a Route Handler, not a redirect
  // straight out of this Server Component.
  if (authError && (!authError.status || authError.status >= 500))
    throw new Error('La connexion est momentanément indisponible. Réessayez.')
  if (!user) redirect('/auth/clear-session')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, subscription_status')
    .eq('id', user.id)
    .single()

  if (profileError || !profile)
    throw new Error(
      'Votre espace est momentanément indisponible. Réessayez dans un instant.',
    )

  const expired =
    profile.plan === 'free_trial' &&
    (!profile.trial_ends_at ||
      !Number.isFinite(Date.parse(profile.trial_ends_at)) ||
      new Date(profile.trial_ends_at) <= new Date())

  return (
    <div className="rf-workspace flex h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar — mobile: hamburger + logo + bell | desktop: bell only */}
        <div className="rf-workspace-top flex shrink-0 items-center justify-between border-b border-[#e8e6e0] px-3 sm:px-5">
          {/* Mobile left */}
          <div className="flex items-center gap-3 md:hidden">
            <MobileNav />
            <Logo href="/dashboard" size="sm" />
          </div>
          {/* Desktop spacer */}
          <p className="hidden md:block">
            Encair <span className="mx-3 opacity-40">/</span> Votre suivi des
            impayés
          </p>
          {/* Right: notification bell */}
          <NotificationBell />
        </div>

        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto">
          {['past_due', 'incomplete'].includes(profile.subscription_status ?? '') && (
            <PaymentFailedBanner />
          )}
          {expired && (
            <div
              role="status"
              className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm"
            >
              Votre essai est terminé. Vous pouvez consulter et exporter vos
              factures.{' '}
              <a href="/subscription" className="underline font-medium">
                Voir l’abonnement
              </a>
            </div>
          )}
          {children}
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
