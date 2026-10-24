'use client'

import { AlertTriangle } from 'lucide-react'

/**
 * Upfront notice shown on the auth pages when the public Supabase env vars are
 * missing at build time. NEXT_PUBLIC_* values are inlined into the client
 * bundle, so their absence here means the deploy was built without them — in
 * which case login/signup can never work. Surfacing it *before* the user fills
 * the form (instead of a cryptic error after clicking) turns a dead end into a
 * clear, actionable message.
 */
export function AuthConfigNotice() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (configured) return null

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Connexion momentanément indisponible</p>
          <p className="mt-1 text-amber-800 leading-relaxed">
            La création de compte et la connexion ne sont pas disponibles pour le
            moment. Réessayez un peu plus tard.
          </p>
        </div>
      </div>
    </div>
  )
}
