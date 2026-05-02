'use client'

import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-blue-400/60 hover:text-blue-300 text-xs transition-colors"
    >
      <LogOut className="h-3.5 w-3.5" />
      Se déconnecter
    </button>
  )
}
