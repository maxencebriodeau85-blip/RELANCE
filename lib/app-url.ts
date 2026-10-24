// Preview callbacks must return to the preview; production uses its owned URL.
export function getAppUrl(): string {
  const candidates = process.env.VERCEL_ENV === 'preview'
    ? [process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]
    : [process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]
  for (const value of candidates) {
    try {
      const url = new URL(value || '')
      if (/(^|\.)relanceflow\.fr$/i.test(url.hostname) || url.username || url.password) continue
      if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.origin
    } catch { /* Try the next trusted deployment variable. */ }
  }
  return 'http://localhost:3000'
}
