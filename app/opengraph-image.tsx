/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Encair — Suivi et relance des factures impayées pour TPE'
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
            'linear-gradient(135deg, #182b40 0%, #223b55 100%)',
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
            <svg viewBox="0 0 32 32" width="40" height="40" fill="none">
              <path
                d="M7 10h12M7 16h10M7 22h7M19 23l7-7m-7 0h7v7"
                stroke="#fff"
                strokeWidth="2.5"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: -0.5,
            }}
          >
            Encair
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
              background: 'linear-gradient(90deg, #FFC857, #FF67C0, #ec7041)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            suivies et relancées.
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
            Fondateur · 16 € HT/mois
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
