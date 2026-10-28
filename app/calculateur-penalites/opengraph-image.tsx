import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card'

export const alt = 'Calculateur de pénalités de retard Encair'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogCard({ eyebrow: 'Outil gratuit', title: 'Calculateur de pénalités de retard et d’indemnité de 40 €.' })
}
