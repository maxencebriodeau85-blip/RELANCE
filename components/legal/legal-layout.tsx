import { missingPublisherFields } from '@/lib/legal'
import { PublicPage } from '@/components/landing/public-page'

/**
 * Pages légales et documentation : même coque que le reste du site public,
 * typographie de lecture (`rf-prose`) et liens soulignés.
 */
export function LegalLayout({
  title,
  lastUpdated,
  eyebrow = 'Informations légales',
  showPublisherNotice = true,
  children,
}: {
  title: string
  lastUpdated: string
  eyebrow?: string
  showPublisherNotice?: boolean
  children: React.ReactNode
}) {
  return (
    <PublicPage>
      <div className="rf-page rf-page-narrow">
        <header className="rf-page-head rf-page-head-compact mb-10">
          <span className="rf-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="rf-meta">Dernière mise à jour : {lastUpdated}</p>
        </header>
        <article className="rf-prose">
          {showPublisherNotice && missingPublisherFields().length > 0 && (
            <p role="note">
              Les informations de l’éditeur sont en cours de finalisation. Elles
              doivent être complétées avant l’ouverture commerciale du service.
            </p>
          )}
          {children}
        </article>
      </div>
    </PublicPage>
  )
}
