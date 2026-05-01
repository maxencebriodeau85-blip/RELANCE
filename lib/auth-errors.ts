/**
 * Maps raw Supabase auth error messages to user-friendly French strings.
 * Centralised so every auth flow stays consistent.
 */
export function supabaseAuthError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (m.includes('email not confirmed')) {
    return "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception (et vos spams)."
  }
  if (
    m.includes('email rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('rate limit')
  ) {
    return "Trop d'emails envoyés en peu de temps. Veuillez patienter quelques minutes avant de réessayer."
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet email. Connectez-vous.'
  }
  if (m.includes('password should be')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (m.includes('unable to validate email address')) {
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

  return message
}
