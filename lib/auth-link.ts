import type { SupabaseClient, EmailOtpType } from '@supabase/supabase-js'
import { authDestination } from './auth-navigation'
import { supabaseAuthError } from './auth-errors'

const emailTypes = new Set(['signup', 'email', 'recovery', 'invite', 'email_change', 'magiclink'])
/** Browser client disables automatic URL processing: exactly one consumer per link. */
export async function consumeAuthLink(client: SupabaseClient, url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1))
  const type = url.searchParams.get('type') || hash.get('type')
  if (url.searchParams.has('error') || hash.has('error')) throw new Error('Ce lien est invalide ou a expiré. Demandez-en un nouveau.')
  const code = url.searchParams.get('code')
  const token = url.searchParams.get('token_hash')
  const access = hash.get('access_token')
  const refresh = hash.get('refresh_token')
  let result
  if (code) result = await client.auth.exchangeCodeForSession(code)
  else if (token && type && emailTypes.has(type)) result = await client.auth.verifyOtp({ token_hash: token, type: type as EmailOtpType })
  else if (access && refresh) result = await client.auth.setSession({ access_token: access, refresh_token: refresh })
  else throw new Error('Ce lien est incomplet. Demandez un nouveau lien.')
  if (result.error) throw new Error(supabaseAuthError(result.error.message, result.error.status))
  if (!result.data.session) throw new Error('La session n’a pas pu être ouverte. Connectez-vous pour continuer.')
  return authDestination(type, url.searchParams.get('next'))
}
