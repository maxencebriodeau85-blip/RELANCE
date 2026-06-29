import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

export function SiteFooter() {
  return (
    <footer className="border-t bg-white py-12 px-4">
      <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-5 gap-8">
        <div className="col-span-2 sm:col-span-2">
          <div className="mb-3">
            <Logo size="sm" />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            Pipeline · Relances auto · Facturation intégrée · Mise en demeure conforme.
            Logiciel français pour indépendants, consultants et TPE.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Créé à Paris —{' '}
            <Link href="/about" className="hover:text-blue-600 underline underline-offset-2">
              l&apos;histoire du projet →
            </Link>
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Produit</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/#fonctionnalites" className="hover:text-gray-900">Fonctionnalités</Link></li>
            <li><Link href="/#pricing" className="hover:text-gray-900">Tarifs</Link></li>
            <li><Link href="/#comment-ca-marche" className="hover:text-gray-900">Comment ça marche</Link></li>
            <li><Link href="/auth/register" className="hover:text-gray-900">Essai gratuit 30 j</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Ressources</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/guides" className="hover:text-gray-900">Guides recouvrement</Link></li>
            <li><Link href="/modeles" className="hover:text-gray-900">Modèles de relance</Link></li>
            <li><Link href="/calculateur-penalites" className="hover:text-gray-900">Calculateur pénalités</Link></li>
            <li><Link href="/changelog" className="hover:text-gray-900">Changelog</Link></li>
            <li><Link href="/#faq" className="hover:text-gray-900">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Société &amp; légal</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link href="/about" className="hover:text-gray-900">À propos</Link></li>
            <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
            <li><Link href="/cgu" className="hover:text-gray-900">CGU</Link></li>
            <li><Link href="/privacy" className="hover:text-gray-900">Confidentialité</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-gray-900">Mentions légales</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} RelanceFlow · Logiciel français de recouvrement amiable pour indépendants.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Service opérationnel
          </span>
          <span>Hébergement Europe · RGPD</span>
        </div>
      </div>
    </footer>
  )
}
