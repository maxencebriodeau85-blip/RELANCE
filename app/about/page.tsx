import Link from 'next/link'
import { Zap, Target, Shield, Heart, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'À propos | RelanceFlow',
  description: 'RelanceFlow aide les indépendants et TPE françaises à se faire payer sans effort — relances automatiques, mises en demeure conformes, tableau de bord.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Se connecter →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
            Notre mission
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-6">
            Créé pour les indépendants<br className="hidden sm:block" /> qui en ont assez de courir après leur argent
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            RelanceFlow est né d&apos;une frustration simple : passer des heures à écrire des relances polies, puis fermes, puis menaçantes — pour des factures qui auraient dû être payées depuis des semaines.
          </p>
        </div>

        {/* Story */}
        <div className="prose prose-gray max-w-none mb-16">
          <div className="bg-gray-50 rounded-2xl p-8 mb-10">
            <h2 className="text-xl font-bold text-gray-900 mt-0">Le problème</h2>
            <p className="text-gray-600">
              En France, plus d&apos;un tiers des indépendants ont connu au moins une facture impayée de plus de 30 jours au cours de la dernière année.
              Le délai moyen de paiement des TPE par leurs clients atteint 45 jours — contre 30 jours légaux.
              Résultat : des problèmes de trésorerie, du stress, et du temps perdu en relances manuelles plutôt qu&apos;à produire.
            </p>
            <p className="text-gray-600 mb-0">
              Les outils de comptabilité existants proposent parfois une relance basique. Mais envoyer le bon email, au bon moment, avec la bonne escalade — et générer une vraie mise en demeure conforme au droit français le moment venu — c&apos;est un autre niveau de complexité.
            </p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-8 mb-10">
            <h2 className="text-xl font-bold text-gray-900 mt-0">Notre réponse</h2>
            <p className="text-gray-600">
              RelanceFlow automatise l&apos;intégralité du cycle de relance — du rappel cordial à la mise en demeure légale — en respectant les contraintes spécifiques aux indépendants français : TVA non applicable (art. 293B CGI), mentions obligatoires sur les factures, pénalités de retard selon le Code de commerce.
            </p>
            <p className="text-gray-600 mb-0">
              Nous ne remplaçons pas votre comptable ni votre avocat. Nous vous épargnons la partie la plus chronophage et éprouvante du recouvrement amiable, pour que vous puissiez vous concentrer sur votre métier.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {[
            {
              icon: Target,
              title: 'Simple par conception',
              desc: 'Créer une facture, envoyer une relance : deux clics. Pas de formation requise, pas de configuration complexe.',
            },
            {
              icon: Shield,
              title: 'Conforme au droit français',
              desc: 'Mentions légales obligatoires, mises en demeure conformes à l\'article 1344 du Code civil, pénalités calculées selon le Code de commerce.',
            },
            {
              icon: Heart,
              title: 'Humain avant tout',
              desc: 'Les templates sont conçus pour rester professionnels sans jamais être agressifs — votre relation client est précieuse.',
            },
            {
              icon: Zap,
              title: 'Paiement en un clic',
              desc: 'Chaque relance peut inclure un lien de paiement Stripe sécurisé — votre client règle en 30 secondes depuis son téléphone.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 p-6 rounded-xl border border-gray-100 bg-white">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-10 text-white">
          <h2 className="text-2xl font-bold mb-3">Commencez gratuitement</h2>
          <p className="text-blue-100 mb-6">30 jours d&apos;essai, sans carte bancaire. Toutes les fonctionnalités incluses.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Créer un compte gratuit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-6 mt-12 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">Accueil</Link>
          <Link href="/cgu" className="hover:text-gray-600">CGU</Link>
          <Link href="/mentions-legales" className="hover:text-gray-600">Mentions légales</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
      </div>
    </div>
  )
}
