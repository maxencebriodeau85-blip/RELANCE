'use client'

import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient()
    try {
      // scope:'local' guarantees local cookies/session are cleared even if the
      // server call fails (offline / 500) — otherwise a failed signOut leaves
      // the cookie in place and the middleware bounces the user back to /dashboard.
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore — we redirect regardless; local session is already dropped
    }
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleSignOut}
      type="button"
      className="flex items-center gap-1.5 text-xs text-[#4e5b68] underline-offset-4 transition-colors hover:text-[#182b40] hover:underline"
    >
      <LogOut className="h-3.5 w-3.5" />
      Se déconnecter
    </button>
  )
}
