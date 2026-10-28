import { getAppUrl } from '@/lib/app-url'
import type { MetadataRoute } from 'next'
import { GUIDES } from '@/lib/guides-content'
import { LEGAL_LAST_UPDATED_ISO, PRIVACY_LAST_UPDATED_ISO } from '@/lib/legal'

// Domaine de production configuré : jamais l'URL d'un déploiement de prévisualisation.
const BASE_URL = getAppUrl()

/**
 * Dernière modification notable des pages commerciales (accueil, à propos,
 * sécurité, outils). À avancer quand leur contenu change vraiment : une date
 * qui bouge à chaque déploiement apprend aux moteurs à l'ignorer.
 */
const SITE_CONTENT_UPDATED = '2026-10-28'
const API_DOCS_UPDATED = '2026-10-18'

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${BASE_URL}${path === '/' ? '' : path}`
  const latestGuide = GUIDES.map((g) => g.updatedAt).sort().at(-1) ?? SITE_CONTENT_UPDATED

  return [
    { url: url('/'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'weekly', priority: 1 },
    { url: url('/about'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/securite'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/guides'), lastModified: latestGuide, changeFrequency: 'weekly', priority: 0.8 },
    ...GUIDES.map((g) => ({
      url: url(`/guides/${g.slug}`),
      lastModified: g.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: url('/modeles'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/calculateur-penalites'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: url('/contact'), lastModified: SITE_CONTENT_UPDATED, changeFrequency: 'yearly', priority: 0.4 },
    { url: url('/api-docs'), lastModified: API_DOCS_UPDATED, changeFrequency: 'monthly', priority: 0.3 },
    { url: url('/cgu'), lastModified: LEGAL_LAST_UPDATED_ISO, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacy'), lastModified: PRIVACY_LAST_UPDATED_ISO, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/dpa'), lastModified: LEGAL_LAST_UPDATED_ISO, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/mentions-legales'), lastModified: LEGAL_LAST_UPDATED_ISO, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
