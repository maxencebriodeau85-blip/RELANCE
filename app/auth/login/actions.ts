'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = {
  error: string
} | null

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard'

  if (!email || !password) {
    return { error: 'Veuillez remplir tous les champs.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (
      error.message.includes('Invalid login credentials') ||
      error.message.includes('invalid_credentials')
    ) {
      return { error: 'Email ou mot de passe incorrect.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return {
        error:
          'Votre adresse email n\'est pas encore confirmée. Vérifiez votre boîte de réception (et vos spams).',
      }
    }
    return { error: error.message }
  }

  // Server-side redirect — session cookies are set in the HTTP response
  // before the browser makes the next request, so the middleware always
  // sees a valid session. This is the approach used by MEG, Evoliz, Obat.
  redirect(redirectTo)
}
