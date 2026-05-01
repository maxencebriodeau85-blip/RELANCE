'use server'

import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error?: string
  success?: boolean
} | null

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

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
          "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception et vos spams.",
      }
    }
    return { error: error.message }
  }

  // Return success — do NOT call redirect() here.
  // The Supabase server client has already written Set-Cookie headers into the
  // HTTP response for this server action call. The browser stores those cookies
  // when it receives this response. The client-side useEffect then does a hard
  // navigation (window.location.href) so the next request to /dashboard carries
  // valid session cookies and the middleware lets it through.
  return { success: true }
}
