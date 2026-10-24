'use server'

import { redirect } from 'next/navigation'
import { getAppUrl } from '@/lib/app-url'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAuthError } from '@/lib/auth-errors'
import { TERMS_VERSION } from '@/lib/legal'
import { COMPROMISED_PASSWORD_MESSAGE, isPasswordCompromised } from '@/lib/password-security'

export type RegisterState = {
  error?: string
  success?: boolean
  email?: string
} | null

export async function registerAction(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const field = (name: string) => typeof formData.get(name) === 'string' ? String(formData.get(name)) : ''
  const email = field('email').trim()
  const password = field('password')
  const confirmPassword = field('confirmPassword')
  const companyName = field('companyName').trim()
  const acceptTerms = formData.get('acceptTerms') === 'on'
  const professionalUse = formData.get('professionalUse') === 'on'

  if (!email || !password || !companyName) {
    return { error: 'Veuillez remplir tous les champs obligatoires.' }
  }

  if (!acceptTerms || !professionalUse) {
    return {
      error:
        'Veuillez accepter les conditions générales et confirmer l’usage professionnel pour créer votre compte.',
    }
  }

  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas.' }
  }

  if (!z.string().email().max(254).safeParse(email).success || companyName.length > 200 || password.length > 128) {
    return { error: 'Vérifiez votre adresse email et la longueur des champs.' }
  }
  if (await isPasswordCompromised(password)) {
    return { error: COMPROMISED_PASSWORD_MESSAGE }
  }

  const appUrl = getAppUrl()

  let data
  try {
    const supabase = await createClient()

    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Registration snapshot is copied by migration 016 into protected columns.
        data: {
          company_name: companyName,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
          professional_use: true,
        },
        // /auth/confirm is a client page that handles all three token formats:
        // PKCE (?code=), OTP (?token_hash=&type=), and implicit (#access_token=).
        // The implicit format puts tokens in the URL hash which never reaches the
        // server — only a client page can read window.location.hash.
        emailRedirectTo: `${appUrl}/auth/confirm`,
      },
    })

    if (result.error) return { error: supabaseAuthError(result.error.message, result.error.status) }
    data = result.data
  } catch {
    return { error: 'Le service d’inscription ne répond pas. Réessayez dans un instant.' }
  }

  // When Supabase has email confirmation disabled, signUp returns a session
  // immediately — redirect straight to the dashboard.
  if (data.session) {
    redirect('/dashboard')
  }

  // Anti-enumeration behaviour of Supabase: signing up with an ALREADY
  // CONFIRMED email returns no error and no session, with an empty
  // `identities` array. Without this check we'd show "Vérifie ton email"
  // to a returning user who will never receive a mail — a dead end that
  // loses the account. Detect it and steer them to login / reset instead.
  const alreadyRegistered =
    !data.session && (!data.user || (data.user.identities?.length ?? 0) === 0)
  if (alreadyRegistered) {
    return {
      error:
        'Un compte existe déjà avec cet email. Connectez-vous, ou réinitialisez votre mot de passe si vous l’avez oublié.',
      email,
    }
  }

  return { success: true, email }
}
