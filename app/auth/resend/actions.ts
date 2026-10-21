'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/app-url'
import { supabaseAuthError } from '@/lib/auth-errors'
export async function resendConfirmation(_state: { error?: string; success?: boolean } | null, form: FormData) {
  const email = z.string().trim().email().max(254).safeParse(form.get('email'))
  if (!email.success) return { error: 'Saisissez une adresse email valide.' }
  try {
    const client = await createClient()
    const { error } = await client.auth.resend({ type: 'signup', email: email.data, options: { emailRedirectTo: `${getAppUrl()}/auth/confirm` } })
    if (error) return { error: supabaseAuthError(error.message, error.status) }
    return { success: true }
  } catch { return { error: 'Le service ne répond pas. Réessayez dans un instant.' } }
}
