'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAuthError } from '@/lib/auth-errors'

export type RegisterState = {
  error?: string
  success?: boolean
  email?: string
} | null

export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const companyName = (formData.get('companyName') as string)?.trim()

  if (!email || !password || !companyName) {
    return { error: 'Veuillez remplir tous les champs obligatoires.' }
  }

  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' }
  }

  // Build the callback URL from the actual request host, not a hardcoded env var.
  // This works both in dev (localhost) and in any production deployment.
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const appUrl = `${proto}://${host}`

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: supabaseAuthError(error.message) }
  }

  // When Supabase has email confirmation disabled, signUp returns a session
  // immediately — redirect straight to the dashboard.
  if (data.session) {
    redirect('/dashboard')
  }

  return { success: true, email }
}
