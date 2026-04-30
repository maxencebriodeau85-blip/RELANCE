import Link from 'next/link'
import { Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Accueil
            </Link>
            <Link href="/auth/login" className="hover:text-gray-900 transition-colors">
              Se connecter
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-sm text-gray-500">Dernière mise à jour : {lastUpdated}</p>
        </div>
        <article className="legal-content space-y-4 text-gray-700 leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_strong]:text-gray-900 [&_a]:text-blue-600 [&_a:hover]:underline">
          {children}
        </article>
      </main>

      <footer className="border-t bg-gray-50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2024 RelanceFlow. Tous droits réservés.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/cgu" className="hover:text-gray-900">CGU</Link>
            <Link href="/privacy" className="hover:text-gray-900">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-gray-900">Mentions légales</Link>
            <Link href="/support" className="hover:text-gray-900">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
