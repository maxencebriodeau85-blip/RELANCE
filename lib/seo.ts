import type { Metadata } from 'next'
import { getAppUrl } from '@/lib/app-url'
import { OFFER } from '@/lib/plans'
import type { GuideContent } from '@/lib/guides-content'

/**
 * Données structurées schema.org (JSON-LD). Toutes les URL sont absolues :
 * Google ignore un logo ou une page référencés par un chemin relatif.
 * Aucune note, aucun avis : Encair n'en a pas encore de réels.
 */
const abs = (path: string) => new URL(path, getAppUrl()).toString()

/**
 * Métadonnées d'une page publique : titre, description, URL canonique et
 * Open Graph complets. Sans cela, une page hérite du titre Open Graph de
 * l'accueil, ou perd son image de partage dès qu'elle définit openGraph.
 * Une image `opengraph-image` propre à la page remplace l'image par défaut.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
}: {
  title: string
  description: string
  path: string
  ogTitle?: string
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle ?? `${title} — Encair`,
      description,
      url: path,
      type: 'website',
      siteName: 'Encair',
      locale: 'fr_FR',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Encair — suivi et relance des factures impayées' }],
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': abs('/#organisation'),
    name: 'Encair',
    url: abs('/'),
    logo: abs('/apple-icon.png'),
    description: 'Suivi et relance des factures impayées pour les TPE.',
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#site'),
    name: 'Encair',
    url: abs('/'),
    inLanguage: 'fr-FR',
    publisher: { '@id': abs('/#organisation') },
  }
}

export function softwareJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Encair',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Suivi des impayés, import CSV et relances email pour les petites entreprises.',
    url: abs('/'),
    inLanguage: 'fr-FR',
    publisher: { '@id': abs('/#organisation') },
    offers: {
      '@type': 'Offer',
      name: OFFER.name,
      price: String(OFFER.price),
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(OFFER.price),
        priceCurrency: 'EUR',
        unitText: 'mois',
        valueAddedTaxIncluded: false,
      },
    },
  }
}

/** FAQ visible sur la page : les réponses doivent être celles affichées. */
export function faqJsonLd(items: readonly (readonly [string, string])[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Accueil', path: '/' }, ...trail].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: abs(item.path),
    })),
  }
}

export function articleJsonLd(guide: GuideContent, authorName: string) {
  const url = abs(`/guides/${guide.slug}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    inLanguage: 'fr-FR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: abs(`/guides/${guide.slug}/opengraph-image`),
    author: { '@type': 'Person', name: authorName },
    publisher: { '@id': abs('/#organisation') },
  }
}

/** Sérialise sans permettre de refermer la balise <script> depuis une donnée. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
