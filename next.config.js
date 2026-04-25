/** @type {import('next').NextConfig} */
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
        source: '/api/stripe/webhook',
        headers: [{ key: 'x-content-type-options', value: 'nosniff' }],
      },
    ]
  },
}

module.exports = nextConfig
