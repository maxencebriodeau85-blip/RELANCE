import Link from 'next/link'
import { Zap, ArrowRight, Mail } from 'lucide-react'

export const metadata = {
  title: 'À propos — RelanceFlow',
  description: 'Qui est derrière RelanceFlow, pourquoi ce produit existe, et où il en est.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/95 sticky top-0 z-50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Essai gratuit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-20">
        {/* Founder intro */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-extrabold flex-shrink-0">
              M
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maxence Briodeau</h1>
              <p className="text-gray-500 text-sm mt-0.5">Créateur de RelanceFlow</p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none space-y-5 text-gray-700 leading-relaxed">
            <p className="text-lg">
              J&apos;ai créé RelanceFlow parce que j&apos;avais un problème simple et récurrent : les deals mouraient en silence.
            </p>
            <p>
              Pas parce que les prospects n&apos;étaient pas intéressés. Parce que je n&apos;avais pas relancé au bon moment. Une semaine chargée, un oubli, et un deal à 8 000 € part chez un concurrent qui a juste envoyé un email de plus.
            </p>
            <p>
              Les outils existants ne collaient pas. HubSpot est conçu pour des équipes sales, en anglais, et facture 40 €/mois minimum pour les fonctionnalités de base. Pipedrive fait le pipeline mais ne facture pas. Aucun outil ne fermait la boucle complète : pipeline → relances → facturation → encaissement — sans intervention manuelle.
            </p>
            <p>
              Alors j&apos;ai construit celui que j&apos;aurais aimé avoir.
            </p>
          </div>
        </div>

        {/* Product status */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Statut actuel — Accès beta</span>
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">
            RelanceFlow est fonctionnel et utilisable dès aujourd&apos;hui. Pipeline, relances automatiques et facturation sont opérationnels.
            Je cherche des premiers utilisateurs pour tester le produit, remonter des bugs, et me dire ce qui manque.
            En échange : accès gratuit étendu à 30 jours, prix bloqué à 15 €/mois à vie.
          </p>
        </div>

        {/* What exists */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Ce qui existe aujourd&apos;hui</h2>
          <ul className="space-y-3">
            {[
              'Pipeline kanban 5 étapes avec glisser-déposer',
              'Journal d\'activité (appels, emails, notes, réunions)',
              'Séquences de relance prospects automatiques (J+3 / J+7 / J+14)',
              'Création de factures depuis un deal signé',
              'Relances factures automatiques (J+7 / J+15 / J+30)',
              'Paiement en ligne via Stripe',
              'Dashboard commercial et stats',
              'Notifications intelligentes',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="text-green-500 font-bold mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* What's next */}
        <div className="mb-14">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Ce qui arrive ensuite</h2>
          <ul className="space-y-3">
            {[
              'Intégrations comptables (Pennylane, Sage)',
              'Application mobile',
              'Scénarios de relance personnalisables',
              'Mise en demeure par courrier recommandé',
              'Multi-utilisateurs (pour cabinets)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                <span className="text-gray-300 font-bold mt-0.5">○</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-4">
            Les priorités sont définies avec les premiers utilisateurs. Si quelque chose te manque, dis-le moi.
          </p>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border bg-gray-50 p-6 mb-10">
          <h2 className="text-base font-bold text-gray-900 mb-2">Une question ? Un feedback ?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Je réponds personnellement à tous les emails. Pas un bot, pas un support externalisé.
          </p>
          <a
            href="mailto:hello@relanceflow.fr"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
          >
            <Mail className="h-4 w-4" />
            hello@relanceflow.fr
          </a>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3.5 text-base transition-colors shadow-lg shadow-blue-100"
          >
            Tester gratuitement — 30 jours beta
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-gray-400 mt-3">Sans carte bancaire · Sans engagement</p>
        </div>
      </main>

      <footer className="border-t bg-gray-50 py-8 mt-8">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-700 transition-colors">← Retour à l&apos;accueil</Link>
          <div className="flex gap-4">
            <Link href="/cgu" className="hover:text-gray-700">CGU</Link>
            <Link href="/privacy" className="hover:text-gray-700">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-gray-700">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
