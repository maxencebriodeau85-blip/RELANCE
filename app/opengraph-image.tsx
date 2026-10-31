import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og-card'
import { OFFER, priceLabel } from '@/lib/plans'

export const alt = 'Encair — Suivi et relance des factures impayées pour TPE'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogCard({
    eyebrow: 'Pour les TPE',
    title: 'Vos factures impayées, suivies et relancées.',
    footer: `${OFFER.trialDays} jours gratuits · sans carte bancaire · ${priceLabel(OFFER.price)} ensuite`,
  })
}
