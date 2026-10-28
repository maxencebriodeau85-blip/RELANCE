import { serializeJsonLd } from '@/lib/seo'

/** Données structurées schema.org, sérialisées sans risque d'injection HTML. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
