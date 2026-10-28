import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card'

export const alt = 'Guides Encair : recouvrement et droit commercial'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogCard({ eyebrow: 'Ressources gratuites', title: 'Le recouvrement des factures, expliqué simplement.' })
}
