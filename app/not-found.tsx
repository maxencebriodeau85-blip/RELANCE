import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Se connecter</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg">
          <div className="relative mb-8">
            <div className="text-[180px] md:text-[220px] font-bold leading-none bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-blue-100/50 blur-2xl"></div>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Page introuvable
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            Cette page n&apos;existe pas ou a été déplacée. Pas de panique — retournons à
            l&apos;essentiel.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button size="lg" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Retour à l&apos;accueil
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mon dashboard
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-white/60 backdrop-blur p-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-600" />
              Pages populaires
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#fonctionnalites" className="text-blue-600 hover:underline">
                  → Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-blue-600 hover:underline">
                  → Tarifs et plans
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-blue-600 hover:underline">
                  → Questions fréquentes
                </Link>
              </li>
              <li>
                <Link href="/support" className="text-blue-600 hover:underline">
                  → Support et contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t bg-white/60 backdrop-blur-sm py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          © 2026 RelanceFlow · <Link href="/support" className="hover:text-gray-900">Support</Link>
        </div>
      </footer>
    </div>
  )
}
