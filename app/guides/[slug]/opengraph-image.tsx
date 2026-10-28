import { GUIDES } from '@/lib/guides-content'
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card'

export const alt = 'Guide Encair sur le recouvrement des factures'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = GUIDES.find((g) => g.slug === slug)
  return ogCard({
    eyebrow: guide ? `Guide · ${guide.category}` : 'Guide',
    title: guide?.metaTitle ?? 'Guides du recouvrement',
    footer: guide ? `${guide.readTime} de lecture · Guide Encair` : undefined,
  })
}
