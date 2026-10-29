/** @type {import('next').NextConfig} */

// 'unsafe-eval' n'est nécessaire qu'au serveur de développement (rechargement
// à chaud). Aucun bundle de production n'évalue de code : le retirer en
// production empêche un script injecté de fabriquer du code via eval().
const devOnlyEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"

const cspHeader = [
  "default-src 'self'",
  // Next.js inline scripts + Stripe.js
  `script-src 'self' 'unsafe-inline'${devOnlyEval} https://js.stripe.com https://checkout.stripe.com https://va.vercel-scripts.com`,
  // Styles: inline (Next.js). La police Inter est servie par le site.
  "style-src 'self' 'unsafe-inline'",
  // Fonts (Inter embarquée dans app/fonts)
  "font-src 'self' data:",
  // Images: self, Supabase storage, Stripe, data URIs
  "img-src 'self' data: blob: https://*.supabase.co https://q.stripe.com",
  // Fetch/XHR: self + Supabase API + Stripe API + Vercel analytics
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  // Stripe Checkout iframe
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
  // Workers for Next.js
  "worker-src 'self' blob:",
  "base-uri 'self'",
  // Équivalent moderne de X-Frame-Options: DENY (aucun site ne peut encadrer Encair)
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Block all plugins (Flash etc.)
  "object-src 'none'",
  // Upgrade HTTP to HTTPS
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  outputFileTracingIncludes: { '/api/invoices/*/pdf': ['./assets/fonts/DejaVuSans.ttf'] },
  // Encair n'utilise pas next/image. L'optimiseur reste coupé et n'accepte
  // aucune image distante : l'ancien motif *.supabase.co laissait n'importe
  // quel projet Supabase lui servir un SVG (GHSA-2464-fhr4-w9xw, corrigée en
  // 15.5.28). Réactiver seulement avec l'hôte exact du projet, jamais *.
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  async redirects() {
    return [
      // Une seule page de contact et une seule FAQ (accueil).
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/dashboard/pipeline', destination: '/dashboard/clients', permanent: true },
      { source: '/dashboard/contacts/:path*', destination: '/dashboard/clients', permanent: true },
      { source: '/support', destination: '/contact', permanent: true },
      // Le journal des versions publiait d'anciens prix et des détails internes.
      { source: '/changelog', destination: '/', permanent: true },
      { source: '/cgv', destination: '/cgu', permanent: true },
      { source: '/conditions-generales-de-vente', destination: '/cgu', permanent: true },
      { source: '/confidentialite', destination: '/privacy', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' }, // CSP supersedes this legacy header
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.stripe.com")',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      // Stripe webhook endpoint must not be touched by CSP or CSRF headers
      {
        source: '/api/stripe/webhook',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
