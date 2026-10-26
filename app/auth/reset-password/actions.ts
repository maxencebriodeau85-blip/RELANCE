'use server'

import { COMPROMISED_PASSWORD_MESSAGE, isPasswordCompromised } from '@/lib/password-security'

// Advisory check before the browser calls updateUser. It protects honest users
// from picking a leaked password; the authoritative check belongs to Supabase
// Auth once leaked password protection is enabled on a paid plan.
export async function checkNewPassword(password: string): Promise<string | null> {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return null
  return (await isPasswordCompromised(password)) ? COMPROMISED_PASSWORD_MESSAGE : null
}
