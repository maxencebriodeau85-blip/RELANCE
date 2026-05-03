/** @type {import('next').NextConfig} */

const cspHeader = [
  "default-src 'self'",
  // Next.js inline scripts + Stripe.js
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
  // Styles: inline (Next.js) + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: self, Supabase storage, Stripe, data URIs
  "img-src 'self' data: blob: https://*.supabase.co https://q.stripe.com",
  // Fetch/XHR: self + Supabase API + Stripe API
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  // Stripe Checkout iframe
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
  // Workers for Next.js
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  // Block all plugins (Flash etc.)
  "object-src 'none'",
  // Upgrade HTTP to HTTPS
  "upgrade-insecure-requests",
].join('; ')

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
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
