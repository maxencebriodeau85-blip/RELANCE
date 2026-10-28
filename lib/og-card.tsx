import { ImageResponse } from 'next/og'
import { brandColors, symbolPath, wordmarkPaths } from '@/lib/brand/artwork'

/** Format commun des images de partage (Open Graph et X). */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

/**
 * Carte de partage aux couleurs d'Encair : papier, encre marine, accent
 * orange et le logo vectoriel officiel (mêmes tracés que l'interface).
 */
export function ogCard({
  eyebrow,
  title,
  footer = 'Suivi et relance des factures impayées pour les TPE',
}: {
  eyebrow: string
  title: string
  footer?: string
}) {
  const titleSize = title.length > 70 ? 54 : title.length > 45 ? 62 : 72
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: brandColors.paper,
          color: brandColors.ink,
          borderBottom: `16px solid ${brandColors.ink}`,
        }}
      >
        <svg viewBox="0 0 296 64" width={259} height={56} fill="none">
          <path d={symbolPath} stroke={brandColors.ink} strokeWidth="10.5" strokeLinecap="round" />
          <rect x="25" y="28" width="36" height="9" rx="4.5" fill={brandColors.accent} />
          {wordmarkPaths.map((d) => (
            <path key={d} d={d} fill={brandColors.ink} fillRule="evenodd" />
          ))}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1000 }}>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#a74a28' }}>
            {eyebrow}
          </div>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#4e5b68' }}>{footer}</div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
