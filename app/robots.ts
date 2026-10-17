import { getAppUrl } from '@/lib/app-url'
import type { MetadataRoute } from 'next'

// Hardcoded production domain — see sitemap.ts for rationale.
const BASE_URL = getAppUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/',
          '/pay/',
          '/subscription/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
