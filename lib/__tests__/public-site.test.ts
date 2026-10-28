import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GUIDES } from '../guides-content'
import { REMINDER_TEMPLATES } from '../reminder-templates'
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, pageMetadata, serializeJsonLd } from '../seo'

const root = join(__dirname, '..', '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

// Pages publiques : chacune doit utiliser la coque commune (navigation,
// <main id="main-content"> et pied de page) et l'identité Encair.
const PUBLIC_PAGES = [
  'app/about/page.tsx',
  'app/securite/page.tsx',
  'app/guides/page.tsx',
  'app/guides/[slug]/page.tsx',
  'app/modeles/page.tsx',
  'app/calculateur-penalites/page.tsx',
  'app/contact/page.tsx',
  'app/not-found.tsx',
  'app/cgu/page.tsx',
  'app/privacy/page.tsx',
  'app/dpa/page.tsx',
  'app/mentions-legales/page.tsx',
  'app/api-docs/page.tsx',
]

describe('site public : une seule identité', () => {
  it.each(PUBLIC_PAGES)('%s utilise la coque commune', (page) => {
    expect(read(page)).toMatch(/<PublicPage>|<LegalLayout/)
  })

  it.each([...PUBLIC_PAGES, 'app/page.tsx', 'components/landing/site-footer.tsx', 'components/cookie-banner.tsx'])(
    '%s n’emploie plus les bleus et dégradés de l’ancienne charte',
    (page) => {
      expect(read(page)).not.toMatch(/\b(?:bg|text|from|to|border|ring)-(?:blue|indigo|purple)-\d{2,3}\b|bg-brand-gradient|brand-orb/)
    },
  )

  it('toutes les pages publiques déclarent une URL canonique', () => {
    for (const page of PUBLIC_PAGES.filter((p) => !p.includes('not-found') && !p.includes('contact') && !p.includes('calculateur'))) {
      expect(read(page), page).toMatch(/pageMetadata\(|canonical/)
    }
    expect(read('app/contact/layout.tsx')).toMatch(/pageMetadata\(/)
    expect(read('app/calculateur-penalites/layout.tsx')).toMatch(/pageMetadata\(/)
  })

  it('le pied de page mène à chaque page publique et la page Sécurité au sitemap', () => {
    const footer = read('components/landing/site-footer.tsx')
    for (const href of ['/securite', '/guides', '/modeles', '/calculateur-penalites', '/about', '/contact', '/cgu', '/privacy', '/dpa', '/mentions-legales', '/api-docs'])
      expect(footer).toContain(`'${href}'`)
  })
})

describe('contenus : ce que le site annonce existe vraiment', () => {
  it('trois modèles de relance, comme l’annoncent /modeles et ses métadonnées', () => {
    // Si ce nombre change, mettre à jour le titre et la description de /modeles.
    expect(REMINDER_TEMPLATES).toHaveLength(3)
    expect(read('app/modeles/page.tsx')).toMatch(/Trois modèles/)
  })

  it('aucun guide ne promet un modèle de mise en demeure, qui n’est pas fourni', () => {
    for (const guide of GUIDES) {
      const text = JSON.stringify(guide)
      expect(text, guide.slug).not.toMatch(/modèle exact|modèle à adapter dans nos modèles/i)
    }
    const guide = GUIDES.find((g) => g.slug === 'mise-en-demeure-guide-complet')!
    expect(guide.title).not.toMatch(/modèle/i)
    expect(guide.metaTitle).not.toMatch(/modèle/i)
  })

  it('les dates de mise à jour des guides sont des dates ISO valides, jamais dans le futur', () => {
    for (const g of GUIDES) {
      for (const d of [g.publishedAt, g.updatedAt]) {
        expect(d, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(Number.isNaN(Date.parse(d))).toBe(false)
      }
      expect(g.updatedAt >= g.publishedAt, g.slug).toBe(true)
    }
  })

  it('l’animation d’entrée ne part jamais d’une opacité nulle (sinon aucun FCP/LCP mesuré)', () => {
    const css = read('app/globals.css')
    const keyframes = css.match(/@keyframes page-enter\s*\{[^}]*\}/)?.[0] ?? ''
    expect(keyframes).toMatch(/from\s*\{[^}]*opacity:\s*0?\.\d+/)
    expect(keyframes).not.toMatch(/from\s*\{[^}]*opacity:\s*0\s*;/)
  })
})

describe('référencement : métadonnées et données structurées', () => {
  it('pageMetadata fournit canonique, titre, description et image Open Graph', () => {
    const m = pageMetadata({ title: 'Sécurité', description: 'Desc', path: '/securite' })
    expect(m.alternates?.canonical).toBe('/securite')
    expect(m.openGraph).toMatchObject({ title: 'Sécurité — Encair', description: 'Desc', url: '/securite', locale: 'fr_FR' })
    expect(JSON.stringify(m.openGraph)).toContain('/opengraph-image')
  })

  it('la FAQ structurée reprend exactement les questions et réponses affichées', () => {
    const ld = faqJsonLd([['Q1 ?', 'R1.'], ['Q2 ?', 'R2.']])
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual([['Q1 ?', 'R1.'], ['Q2 ?', 'R2.']])
    expect(read('app/page.tsx')).toMatch(/faqJsonLd\(faq\)/)
  })

  it('fil d’Ariane et article utilisent des URL absolues', () => {
    const crumbs = breadcrumbJsonLd([{ name: 'Guides', path: '/guides' }])
    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2])
    for (const item of crumbs.itemListElement) expect(item.item).toMatch(/^https?:\/\//)
    const article = articleJsonLd(GUIDES[0], 'Auteur')
    expect(article.url).toMatch(/^https?:\/\/.*\/guides\//)
    expect(article.image).toMatch(/^https?:\/\/.*\/opengraph-image$/)
    expect(article.mainEntityOfPage['@id']).toBe(article.url)
  })

  it('les données structurées ne peuvent pas refermer la balise <script>', () => {
    const out = serializeJsonLd({ text: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out).text).toBe('</script><script>alert(1)</script>')
  })
})

describe('plan du site', () => {
  it('liste chaque guide avec sa vraie date, sans doublon ni date « maintenant »', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://encair.fr')
    const { default: sitemap } = await import('../../app/sitemap')
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const g of GUIDES) {
      const entry = entries.find((e) => e.url === `https://encair.fr/guides/${g.slug}`)
      expect(entry?.lastModified, g.slug).toBe(g.updatedAt)
    }
    expect(urls).toContain('https://encair.fr/securite')
    for (const e of entries) {
      expect(e.url).toMatch(/^https:\/\/encair\.fr/)
      expect(String(e.lastModified)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    vi.unstubAllEnvs()
  })

  it('chaque page publique du plan existe dans app/', () => {
    const exists = (path: string) => {
      try {
        return statSync(join(root, 'app', path)).isDirectory()
      } catch {
        return false
      }
    }
    for (const dir of ['about', 'securite', 'guides', 'modeles', 'calculateur-penalites', 'contact', 'api-docs', 'cgu', 'privacy', 'dpa', 'mentions-legales'])
      expect(exists(dir), dir).toBe(true)
    expect(readdirSync(join(root, 'app', 'guides'))).toContain('[slug]')
  })
})

describe('security.txt (RFC 9116)', () => {
  it('donne un contact, une échéance de moins d’un an et l’URL canonique', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://encair.fr')
    const { GET } = await import('../../app/.well-known/security.txt/route')
    const body = await GET().text()
    expect(body).toMatch(/^Contact: (mailto:|https:\/\/)/m)
    expect(body).toContain('Canonical: https://encair.fr/.well-known/security.txt')
    const expires = Date.parse(body.match(/^Expires: (.*)$/m)![1])
    expect(expires).toBeGreaterThan(Date.now())
    expect(expires - Date.now()).toBeLessThan(365 * 24 * 3600 * 1000)
    vi.unstubAllEnvs()
  })
})
