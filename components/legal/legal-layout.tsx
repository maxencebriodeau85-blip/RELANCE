import Link from 'next/link'
import { missingPublisherFields } from '@/lib/legal'
import { SiteNav } from '@/components/landing/site-nav'

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="rf-site min-h-screen">
      <SiteNav />

      <main id="main-content" className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-sm text-gray-500">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>
        <article className="legal-content space-y-4 text-gray-700 leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_strong]:text-gray-900 [&_a]:text-blue-600 [&_a:hover]:underline">
          {missingPublisherFields().length > 0 && (
            <p
              role="note"
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"
            >
              Les informations de l’éditeur sont en cours de finalisation. Elles
              doivent être complétées avant l’ouverture commerciale du service.
            </p>
          )}
          {children}
        </article>
      </main>

      <footer className="border-t bg-gray-50 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Encair</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/cgu" className="hover:text-gray-900">
              CGU/CGV
            </Link>
            <Link href="/privacy" className="hover:text-gray-900">
              Confidentialité
            </Link>
            <Link href="/dpa" className="hover:text-gray-900">
              Sous-traitance
            </Link>
            <Link href="/mentions-legales" className="hover:text-gray-900">
              Mentions légales
            </Link>
            <Link href="/contact" className="hover:text-gray-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
