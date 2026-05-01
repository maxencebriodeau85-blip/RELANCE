'use server'

import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relance-teal.vercel.app'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'Un compte existe déjà avec cet email. Connectez-vous.' }
    }
    return { error: error.message }
  }

  return { success: true, email }
}
