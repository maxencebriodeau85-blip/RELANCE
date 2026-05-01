import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FAQSection } from '@/components/landing/faq-section'
import {
  Zap,
  Clock,
  TrendingUp,
  FileText,
  Shield,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Mail,
  AlertTriangle,
  Download,
} from 'lucide-react'

const features = [
  {
    icon: Mail,
    title: 'Relances email automatiques',
    description:
      'Envoyez des relances personnalisées selon un scénario progressif : cordial, ferme, pré-contentieux. Chaque email est généré avec les informations exactes de la facture.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: FileText,
    title: 'Import CSV en masse',
    description:
      'Importez toutes vos factures en quelques clics depuis votre logiciel de facturation. Détection automatique des colonnes, validation en temps réel.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: AlertTriangle,
    title: 'Mise en demeure légale',
    description:
      'Générez en un clic une mise en demeure conforme au droit français (art. L441-10 C. com.), avec calcul automatique des pénalités de retard.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Tableau de bord DSO',
    description:
      'Pilotez votre recouvrement en temps réel : créances en cours, balance âgée, taux de recouvrement, jours de retard moyens (DSO).',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Shield,
    title: 'Conformité RGPD',
    description:
      "Données hébergées en Europe, chiffrement SSL, conformité RGPD. Vos données et celles de vos clients sont protégées à chaque instant.",
    color: 'bg-gray-100 text-gray-600',
  },
]

const painPoints = [
  {
    icon: '⏱️',
    title: 'Des heures perdues à relancer manuellement',
    description:
      'Chaque mois, vous passez des heures à envoyer des emails de relance un par un. Un temps précieux que vous pourriez consacrer à votre cœur de métier.',
  },
  {
    icon: '💸',
    title: 'Des factures impayées qui s\'accumulent',
    description:
      'Le délai moyen de paiement en France est de 48 jours. Sans relance systématique, certaines factures ne sont jamais réglées.',
  },
  {
    icon: '😰',
    title: 'La gêne de relancer vos clients',
    description:
      "Relancer un client, c'est toujours inconfortable. Laisser un outil automatisé le faire préserve votre relation commerciale.",
  },
]

const testimonials = [
  {
    name: 'Sophie M.',
    company: 'Agence web, Lyon',
    text: 'Depuis RelanceFlow, mon DSO est passé de 62 à 41 jours. Je récupère 3 semaines de trésorerie supplémentaires !',
    stars: 5,
  },
  {
    name: 'Thomas D.',
    company: 'Cabinet conseil, Paris',
    text: "L'automatisation des relances m'économise 4h par mois. Et mes clients paient plus vite parce que les relances sont envoyées à temps.",
    stars: 5,
  },
  {
    name: 'Marie-Claire B.',
    company: 'Architecte indépendante, Bordeaux',
    text: 'La génération de mise en demeure m\'a permis de récupérer 8 400 € sur un dossier litigieux. Outil indispensable.',
    stars: 5,
  },
]

const pricing = [
  {
    name: 'Starter',
    price: '19',
    period: 'mois',
    description: 'Pour les indépendants et petites structures',
    features: [
      "Jusqu'à 30 factures/mois",
      '3 modèles de relance',
      'Relances email automatiques',
      'Tableau de bord DSO',
      'Import CSV',
      'Support par email',
    ],
    cta: 'Commencer l\'essai gratuit',
    highlighted: false,
    priceId: 'starter',
  },
  {
    name: 'Pro',
    price: '49',
    period: 'mois',
    description: 'Pour les PME avec un volume important',
    features: [
      "Jusqu'à 200 factures/mois",
      'Scénarios personnalisables',
      'Mise en demeure PDF',
      'Import CSV illimité',
      'Statistiques avancées',
      'Support prioritaire',
    ],
    cta: 'Commencer l\'essai gratuit',
    highlighted: true,
    badge: 'Le plus populaire',
    priceId: 'pro',
  },
  {
    name: 'Business',
    price: '99',
    period: 'mois',
    description: 'Pour les grandes structures et cabinets',
    features: [
      "Jusqu'à 1 000 factures/mois",
      'API access',
      'Multi-utilisateurs',
      'Intégration Pennylane',
      'Account manager dédié',
      'SLA 99,9%',
    ],
    cta: 'Commencer l\'essai gratuit',
    highlighted: false,
    priceId: 'business',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#fonctionnalites" className="hover:text-gray-900 transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">
              Tarifs
            </a>
            <a href="#temoignages" className="hover:text-gray-900 transition-colors">
              Témoignages
            </a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/register">Essai gratuit 14j</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 md:py-32">
        <div className="container mx-auto text-center px-4">
          <Badge className="mb-6 bg-blue-100 text-blue-700 border-blue-200 px-4 py-1.5 text-sm">
            🇫🇷 Conçu pour les TPE/PME françaises
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 max-w-4xl mx-auto">
            Encaissez{' '}
            <span className="text-blue-600">15 jours plus tôt</span>,<br />
            sans relancer un seul client à la main
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            RelanceFlow automatise vos relances de factures impayées, génère vos mises en demeure
            légales et améliore votre trésorerie — sans que vous n&apos;ayez rien à faire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-base px-8 py-6 h-auto" asChild>
              <Link href="/auth/register">
                Démarrer l&apos;essai gratuit 14 jours
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-6 h-auto" asChild>
              <a href="#apercu">
                Voir un aperçu →
              </a>
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Sans carte bancaire · Essai gratuit 14 jours · Annulation à tout moment
          </p>

          {/* Social proof */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>+500 TPE/PME utilisatrices</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>14 jours de réduction du DSO en moyenne</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Conforme au droit français</span>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div id="apercu" className="relative mt-16 max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl blur-2xl opacity-60"></div>
            <div className="relative rounded-2xl border bg-white shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="rounded-md bg-white border px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto">
                    relanceflow.fr/dashboard
                  </div>
                </div>
              </div>
              {/* Mockup content */}
              <div className="grid grid-cols-12 gap-0 bg-gray-50 min-h-[420px]">
                {/* Sidebar */}
                <div className="col-span-2 border-r bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                    <div className="h-3 w-16 rounded bg-gray-300"></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 px-2 py-1.5">
                      <BarChart3 className="h-3 w-3 text-blue-600" />
                      <div className="h-2 w-12 rounded bg-blue-200"></div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <FileText className="h-3 w-3 text-gray-400" />
                      <div className="h-2 w-10 rounded bg-gray-200"></div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <div className="h-2 w-14 rounded bg-gray-200"></div>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-gray-400" />
                      <div className="h-2 w-12 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
                {/* Main */}
                <div className="col-span-10 p-6 space-y-4 text-left">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Tableau de bord</h3>
                    <p className="text-xs text-gray-500">Bonjour, voici votre activité</p>
                  </div>
                  {/* KPI cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Encaissé</p>
                      <p className="text-lg font-bold text-gray-900">42 380 €</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" /> +18%
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">En attente</p>
                      <p className="text-lg font-bold text-gray-900">12 740 €</p>
                      <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> 8 factures
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">DSO</p>
                      <p className="text-lg font-bold text-gray-900">41 j</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 rotate-180" /> -14j
                      </p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Taux recouvrement</p>
                      <p className="text-lg font-bold text-gray-900">96 %</p>
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3" /> Excellent
                      </p>
                    </div>
                  </div>
                  {/* Chart placeholder */}
                  <div className="rounded-lg border bg-white p-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-semibold text-gray-700">Encaissements 6 derniers mois</p>
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <div className="h-2 w-2 rounded-full bg-gray-200"></div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-20">
                      {[40, 55, 30, 70, 60, 85].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-blue-500 to-blue-400"
                            style={{ height: `${h}%` }}
                          ></div>
                          <div className="h-1.5 w-4 rounded bg-gray-200"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Recent invoices */}
                  <div className="rounded-lg border bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Relances récentes</p>
                    {[
                      { name: 'Boulangerie Martin', amount: '850 €', status: 'Payée', color: 'green' },
                      { name: 'SARL Dupont', amount: '2 400 €', status: 'Relance 2/3', color: 'orange' },
                      { name: 'Studio Créatif', amount: '1 150 €', status: 'Payée', color: 'green' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                            {row.name[0]}
                          </div>
                          <span className="text-xs text-gray-700">{row.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-900">{row.amount}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              row.color === 'green'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Vous reconnaissez-vous dans ces situations ?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {painPoints.map((point, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="text-3xl mb-4">{point.icon}</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{point.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour recouvrer vos créances
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une plateforme complète qui automatise l&apos;ensemble du processus de recouvrement
              amiable.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="border hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${feature.color} mb-3`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{feature.title}</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Comment ça marche ?</h2>
          <p className="text-blue-200 text-xl mb-16 max-w-2xl mx-auto">
            En 3 étapes simples, automatisez tout votre recouvrement
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Importez vos factures',
                description:
                  'Glissez-déposez votre export CSV depuis votre logiciel de facturation. RelanceFlow détecte automatiquement les colonnes.',
              },
              {
                step: '2',
                title: 'Choisissez votre scénario',
                description:
                  '3 scénarios préconfigurés (Cordial, Ferme, Pré-contentieux) ou créez le vôtre. Les relances partent automatiquement.',
              },
              {
                step: '3',
                title: 'Encaissez plus vite',
                description:
                  'Vos clients reçoivent des relances personnalisées et professionnelles. Générez une mise en demeure en un clic si besoin.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-white/20 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="temoignages" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ce que disent nos clients
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Des tarifs simples et transparents
            </h2>
            <p className="text-xl text-gray-600">
              14 jours d&apos;essai gratuit · Pas de carte bancaire · Annulation à tout moment
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? 'border-blue-600 shadow-lg shadow-blue-100 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3
                    className={`text-lg font-bold mb-1 ${
                      plan.highlighted ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`text-sm mb-4 ${
                      plan.highlighted ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-bold ${
                        plan.highlighted ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {plan.price} €
                    </span>
                    <span
                      className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}
                    >
                      /{plan.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle
                        className={`h-4 w-4 flex-shrink-0 ${
                          plan.highlighted ? 'text-blue-200' : 'text-green-500'
                        }`}
                      />
                      <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : ''
                  }`}
                  variant={plan.highlighted ? 'outline' : 'default'}
                  asChild
                >
                  <Link href="/auth/register">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">
            Prix HT · TVA française applicable · Facturation mensuelle ou annuelle (-20%)
          </p>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à encaisser plus vite ?
          </h2>
          <p className="text-gray-400 text-xl mb-8 max-w-2xl mx-auto">
            Rejoignez les TPE/PME françaises qui améliorent leur trésorerie avec RelanceFlow.
          </p>
          <Button size="lg" className="text-base px-8 py-6 h-auto bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/auth/register">
              Démarrer l&apos;essai gratuit — 0 € pendant 14 jours
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-gray-500 text-sm mt-4">Sans carte bancaire · Résiliation libre</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">RelanceFlow</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                La solution de recouvrement amiable automatisée pour les TPE et PME françaises.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#fonctionnalites" className="hover:text-gray-900">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-gray-900">Tarifs</a></li>
                <li><a href="#temoignages" className="hover:text-gray-900">Témoignages</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/cgu" className="hover:text-gray-900">CGU</a></li>
                <li><a href="/privacy" className="hover:text-gray-900">Confidentialité</a></li>
                <li><a href="/mentions-legales" className="hover:text-gray-900">Mentions légales</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="mailto:hello@relanceflow.fr" className="hover:text-gray-900">hello@relanceflow.fr</a></li>
                <li><a href="/support" className="hover:text-gray-900">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © 2026 RelanceFlow. Tous droits réservés.
            </p>
            <p className="text-sm text-gray-400">
              🇫🇷 Hébergé en France · Conforme RGPD
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
