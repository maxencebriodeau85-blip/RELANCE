/**
 * Maps Supabase auth errors to user-friendly French strings.
 * Accepts the raw error message AND the HTTP status code for more reliable matching.
 * The final fallback never returns a raw Supabase/English string.
 */
export function supabaseAuthError(message: string, status?: number): string {
  // HTTP 429 = rate limit, regardless of the message text
  if (status === 429) {
    return rateLimitMessage()
  }

  const m = message.toLowerCase()

  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect.'
  }

  if (m.includes('email not confirmed')) {
    return "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception et vos spams."
  }

  // All known Supabase rate-limit variants
  if (
    m.includes('email rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('rate limit exceeded') ||
    m.includes('for security purposes') ||
    m.includes('too many requests') ||
    m.includes('request this after')
  ) {
    return rateLimitMessage()
  }

  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email. Connectez-vous.'
  }

  if (m.includes('password should be') || m.includes('password is too short')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }

  if (m.includes('unable to validate email address') || m.includes('invalid email')) {
    return 'Adresse email invalide.'
  }

  if (m.includes('signup is disabled')) {
    return 'Les inscriptions sont temporairement désactivées.'
  }

  if (m.includes('email link is invalid or has expired')) {
    return 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.'
  }

  if (m.includes('token has expired') || m.includes('otp expired')) {
    return 'Ce lien a expiré. Demandez-en un nouveau.'
  }

  if (m.includes('network') || m.includes('fetch')) {
    return 'Erreur réseau. Vérifiez votre connexion et réessayez.'
  }

  // Never expose raw Supabase / English error strings to the user
  return 'Une erreur est survenue. Veuillez réessayer.'
}

function rateLimitMessage(): string {
  return "Trop de tentatives en peu de temps. Patientez quelques minutes puis réessayez."
}
