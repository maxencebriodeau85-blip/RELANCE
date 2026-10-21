/** A return target must stay in this app, including after URL normalization. */
export function safeRedirect(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return fallback
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith('//') || /[\\\x00-\x20\x7f]/.test(decoded)) return fallback
    const url = new URL(value, 'https://encair.invalid')
    if (url.origin !== 'https://encair.invalid' || (url.pathname.startsWith('/auth/') && url.pathname !== '/auth/reset-password')) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return fallback }
}

export function authDestination(type: string | null, next: unknown): string {
  return type === 'recovery' ? '/auth/reset-password' : safeRedirect(next)
}
