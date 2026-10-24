import { createHash } from 'node:crypto'

// Supabase "leaked password protection" requires a paid plan. Until then,
// check Have I Been Pwned with k-anonymity: only the first 5 hex chars of the
// SHA-1 leave the server, never the password or its full hash.
// Returns null when the service cannot answer: callers fail open so an outage
// of a third party never blocks signup or password recovery.
export async function isPasswordCompromised(
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean | null> {
  const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  try {
    const response = await fetcher(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'encair-password-check' },
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
      },
    )
    if (!response.ok) return null
    const body = await response.text()
    return body.split('\n').some((line) => {
      const [candidate, count] = line.trim().split(':')
      // Padding entries have a count of 0 and must be ignored.
      return candidate === suffix && Number(count) > 0
    })
  } catch {
    return null
  }
}

export const COMPROMISED_PASSWORD_MESSAGE =
  'Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre, que vous n’utilisez sur aucun autre site.'
