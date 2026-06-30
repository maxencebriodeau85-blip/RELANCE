// Resolve the public base URL of the app for server-side use (emails, PDF
// links, Stripe redirects). Resolution order, most-specific first:
//
//   1. NEXT_PUBLIC_APP_URL              — set manually in production
//   2. VERCEL_PROJECT_PRODUCTION_URL    — Vercel injects the prod domain
//   3. VERCEL_URL                       — current preview/prod deployment
//   4. http://localhost:3000            — dev fallback
//
// This means a fresh deploy without any env config still produces working
// links (pointing at the deployment URL) instead of dead links to a domain
// that hasn't been purchased yet.
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return stripTrailingSlash(fromEnv)

  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (prodUrl) return `https://${stripTrailingSlash(prodUrl)}`

  const deploymentUrl = process.env.VERCEL_URL
  if (deploymentUrl) return `https://${stripTrailingSlash(deploymentUrl)}`

  return 'http://localhost:3000'
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s
}
