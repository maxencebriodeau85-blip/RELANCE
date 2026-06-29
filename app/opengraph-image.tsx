/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'RelanceFlow — Automatisez vos relances de factures impayées'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'linear-gradient(135deg, #1E1B5E 0%, #4F46E5 50%, #A855F7 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            ⚡
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: -0.5,
            }}
          >
            RelanceFlow
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            maxWidth: 1000,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Vos factures impayées,
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: 'linear-gradient(90deg, #FCD34D, #F0ABFC, #C7D2FE)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            relancées toutes seules.
          </div>
        </div>

        {/* Bottom: badges */}
        <div style={{ display: 'flex', gap: 20, fontSize: 22, color: 'rgba(255,255,255,0.85)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.1)',
              padding: '12px 24px',
              borderRadius: 999,
            }}
          >
            🇫🇷 Logiciel français
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.1)',
              padding: '12px 24px',
              borderRadius: 999,
            }}
          >
            30 jours gratuits · sans CB
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.1)',
              padding: '12px 24px',
              borderRadius: 999,
            }}
          >
            dès 19 €/mois
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
