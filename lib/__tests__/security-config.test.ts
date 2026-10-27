import { createRequire } from 'node:module'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const root = join(__dirname, '..', '..')

const atLeast = (version: string, minimum: string) => {
  const a = version.split('.').map(Number)
  const b = minimum.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return true
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : []
  })
}

describe('configuration de sécurité', () => {
  it('Next.js inclut le correctif GHSA-2464-fhr4-w9xw et GHSA-p3m5-59mp-jv5r', () => {
    const { version } = require('next/package.json') as { version: string }
    expect(atLeast(version, '15.5.28')).toBe(true)
  })

  it("l'optimiseur d'images est coupé et n'accepte aucune image distante", () => {
    const config = require(join(root, 'next.config.js')) as {
      images?: { unoptimized?: boolean; remotePatterns?: unknown[]; domains?: unknown[]; dangerouslyAllowSVG?: boolean }
    }
    expect(config.images?.unoptimized).toBe(true)
    expect(config.images?.remotePatterns ?? []).toEqual([])
    expect(config.images?.domains ?? []).toEqual([])
    expect(config.images?.dangerouslyAllowSVG).not.toBe(true)
  })

  it("seules des valeurs publiques sont exposées au navigateur", () => {
    const allowed = new Set([
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_CONTACT_EMAIL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    ])
    const exposed = new Set<string>()
    for (const dir of ['app', 'components', 'lib', 'hooks']) {
      for (const file of sources(join(root, dir))) {
        for (const match of readFileSync(file, 'utf8').matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) exposed.add(match[0])
      }
    }
    expect([...exposed].filter((name) => !allowed.has(name))).toEqual([])
  })
})
