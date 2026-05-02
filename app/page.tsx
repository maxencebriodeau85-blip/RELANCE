import Link from 'next/link'
import { CashCalculator } from '@/components/landing/cash-calculator'
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
  Smartphone,
  Plug,
  Brain,
  ChevronRight,
  Euro,
  Users,
} from 'lucide-react'

// ─── data ─────────────────────────────────────────────────────────────────────

const stats = [
  { value: '+34%', label: 'de créances récupérées' },
  { value: '52j → 28j', label: 'DSO moyen ramené' },
  { value: '3h', label: 'économisées / semaine' },
  { value: '1 clic', label: 'mise en demeure légale' },
]

const painPoints = [
  {
    wrong: 'Envoyer des relances à la main, une par une',
    right: 'Relances automatiques déclenchées par le retard',
  },
  {
    wrong: 'Oublier les factures en souffrance pendant les congés',
    right: 'Le recouvrement tourne 24h/24, 365j/an',
  },
  {
    wrong: 'Perdre des clients en étant trop agressif ou trop laxiste',
    right: 'Ton progressif et personnalisé selon le profil client',
  },
  {
    wrong: 'Passer des heures à rédiger des mises en demeure légales',
    right: 'Document conforme généré en 1 clic, avec pénalités calculées',
  },
]

const features = [
  {
    icon: Mail,
    title: 'Relances email sur-mesure',
    description:
      'Scénarios progressifs : cordial (J+7), ferme (J+15/30), pré-contentieux (J+45/60). Chaque email est personnalisé avec les données exactes de la facture.',
    color: 'bg-blue-100 text-blue-600',
    badge: null,
  },
  {
    icon: Euro,
    title: 'Paiement en ligne intégré',
    description:
      'Chaque email de relance contient un bouton "Payer maintenant" sécurisé (Stripe). Votre client règle en 30 secondes, sans friction. La facture est marquée payée automatiquement.',
    color: 'bg-emerald-100 text-emerald-600',
    badge: null,
  },
  {
    icon: Plug,
    title: 'Connexion en 1 clic',
    description:
      'Import automatique depuis Pennylane, Sage, QuickBooks, Sellsy, Cegid. Vos factures arrivent seules — l\'import CSV devient une option secondaire.',
    color: 'bg-indigo-100 text-indigo-600',
    badge: 'Bientôt',
  },
  {
    icon: AlertTriangle,
    title: 'Mise en demeure légale',
    description:
      'Document conforme droit français (art. L441-10 C. com.) avec indemnité forfaitaire de 40€ et pénalités de retard calculées automatiquement.',
    color: 'bg-orange-100 text-orange-600',
    badge: null,
  },
  {
    icon: Brain,
    title: 'Scoring client prédictif',
    description:
      'L\'IA analyse les habitudes de paiement pour suggérer le meilleur moment d\'envoi. Le bon message, au bon moment, pour le bon client.',
    color: 'bg-pink-100 text-pink-600',
    badge: 'IA — Bientôt',
  },
  {
    icon: BarChart3,
    title: 'Dashboard DSO & balance âgée',
    description:
      'Pilotez votre poste client en temps réel. Export "Bank-Ready" pour prouver la qualité de vos créances à votre banquier et faciliter vos lignes de trésorerie.',
    color: 'bg-green-100 text-green-600',
    badge: null,
  },
]

const testimonials = [
  {
    quote:
      '"Avant RelanceFlow, j\'avais 3 factures en souffrance depuis 90 jours. En 2 semaines, deux étaient réglées. Je n\'ai rien fait."',
    name: 'Sophie M.',
    role: 'Dirigeante, cabinet de conseil — Lyon',
    stars: 5,
  },
  {
    quote:
      '"Mon DSO est passé de 58 jours à 31 jours en 3 mois. L\'équivalent de 28 000€ de trésorerie libérée. Les relances partent toutes seules."',
    name: 'Thomas B.',
    role: 'DAF, agence digitale — Paris',
    stars: 5,
  },
  {
    quote:
      '"Mes clients n\'ont jamais su que c\'était automatisé. Le ton cordial puis ferme est exactement ce que j\'aurais écrit moi-même."',
    name: 'Marie-Claire D.',
    role: 'Architecte indépendante — Bordeaux',
    stars: 5,
  },
]

const plans = [
  {
    name: 'Starter',
    price: '19',
    period: 'mois',
    desc: 'Pour les indépendants et toutes petites structures',
    limit: '30 factures / mois',
    features: [
      '30 factures / mois',
      'Relances email automatiques',
      '3 scénarios préconfigurés',
      'Mise en demeure en 1 clic',
      'Dashboard DSO',
      'Support email',
    ],
    cta: 'Démarrer',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '49',
    period: 'mois',
    desc: 'Pour les PME avec un volume significatif',
    limit: '200 factures / mois',
    features: [
      '200 factures / mois',
      'Tout Starter, plus :',
      'Relances SMS (bientôt)',
      'Intégrations comptables (bientôt)',
      'Export rapport banquier',
      'Scénarios personnalisés',
      'Support prioritaire',
    ],
    cta: 'Essayer Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '99',
    period: 'mois',
    desc: 'Pour les structures à fort volume ou multi-entités',
    limit: '1 000 factures / mois',
    features: [
      '1 000 factures / mois',
      'Tout Pro, plus :',
      'Scoring client IA (bientôt)',
      'Courrier recommandé auto (bientôt)',
      'API & webhooks',
      'Accès multi-utilisateurs',
      'Account manager dédié',
    ],
    cta: 'Contacter',
    highlight: false,
  },
]

const guides = [
  "L'indemnité forfaitaire de 40€ : comment l'appliquer sans fâcher vos clients",
  'Pénalités de retard légales : calcul, taux et mise en œuvre en 2026',
  'Mise en demeure : modèle, délais et effets juridiques',
  'DSO : pourquoi 45 jours tués votre trésorerie (et comment le réduire à 28)',
  'Recouvrement amiable vs contentieux : quand passer le cap ?',
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">RelanceFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#fonctionnalites" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#calculateur" className="hover:text-gray-900 transition-colors">Calculateur</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            <Link href="/guides" className="hover:text-gray-900 transition-colors">Guides juridiques</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Essai gratuit 14j
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 pt-20 pb-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            +340 dirigeants nous font confiance · Essai gratuit 14 jours
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Cessez d&apos;être le{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              banquier gratuit
            </span>{' '}
            de vos clients.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
            Vos factures ne sont pas des crédits à 0%. RelanceFlow automatise le recouvrement
            de A à Z — de la relance cordiale à la mise en demeure légale — pendant que vous
            vous concentrez sur votre métier.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold px-7 py-3.5 text-base transition-all shadow-lg shadow-blue-500/30"
            >
              Récupérer mes créances maintenant
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#calculateur"
              className="flex items-center gap-2 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-medium px-6 py-3.5 text-base transition-all"
            >
              <Euro className="h-5 w-5" />
              Calculer mon manque à gagner
            </a>
          </div>

          <p className="mt-5 text-sm text-blue-300/50">
            Sans carte bancaire · Données hébergées en Europe · Conforme RGPD
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-sm text-blue-300/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Le recouvrement manuel, c&apos;est fini.
            </h2>
            <p className="text-gray-500 mt-3">
              Chaque heure passée à relancer manuellement est une heure perdue sur votre cœur de métier.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {painPoints.map((p, i) => (
              <div key={i} className="rounded-xl bg-white border p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 mt-0.5">
                    <span className="text-red-500 text-sm font-bold">✕</span>
                  </div>
                  <p className="text-sm text-gray-500 line-through">{p.wrong}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 mt-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{p.right}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculateur" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">
              Combien d&apos;argent dort dehors en ce moment ?
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Entrez votre chiffre d&apos;affaires et votre délai de paiement moyen. Découvrez
              exactement ce que RelanceFlow peut libérer pour vous.
            </p>
          </div>
          <CashCalculator />
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              Tout ce qu&apos;il faut pour recouvrer professionnellement
            </h2>
            <p className="text-gray-500 mt-3">
              Du premier retard à la mise en demeure — chaque étape est couverte.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-xl bg-white border p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {f.badge && (
                      <span className="rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="apercu" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Un poste client piloté comme un professionnel du credit management
            </h2>
            <p className="text-gray-500 mt-3">
              Balance âgée, DSO, urgences du jour, historique de relances — tout en un coup d&apos;œil.
            </p>
          </div>
          {/* Dashboard mockup */}
          <div className="relative rounded-2xl border shadow-2xl overflow-hidden bg-gray-50">
            <div className="flex items-center gap-2 border-b bg-gray-100 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3">
                <div className="rounded bg-white border px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">
                  relanceflow.fr/dashboard
                </div>
              </div>
            </div>
            <div className="flex">
              {/* Sidebar mock */}
              <div className="w-48 bg-white border-r p-3 hidden sm:block">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-5 w-5 rounded bg-blue-600 flex-shrink-0" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
                {['Tableau de bord', 'Factures', 'Scénarios', 'Mise en demeure', 'Paramètres'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded mb-0.5 ${i === 0 ? 'bg-blue-600' : ''}`}>
                    <div className={`h-3 w-3 rounded ${i === 0 ? 'bg-blue-400' : 'bg-gray-200'}`} />
                    <div className={`h-2 rounded ${i === 0 ? 'bg-blue-400 w-20' : 'bg-gray-100 w-16'}`} />
                  </div>
                ))}
              </div>
              {/* Content mock */}
              <div className="flex-1 p-4 space-y-3">
                {/* Alert */}
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-400 rounded-full" />
                    <div className="h-2.5 bg-red-200 rounded w-48" />
                  </div>
                  <div className="h-6 w-24 bg-red-500 rounded text-xs" />
                </div>
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Créances', value: '35 550 €', accent: 'blue' },
                    { label: 'En retard', value: '18 000 €', accent: 'red' },
                    { label: 'Récupéré', value: '12 300 €', accent: 'green' },
                    { label: 'DSO', value: '28j', accent: 'gray' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg bg-white border p-2">
                      <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                      <div className={`text-sm font-bold ${kpi.accent === 'red' ? 'text-red-600' : kpi.accent === 'green' ? 'text-green-600' : kpi.accent === 'blue' ? 'text-blue-700' : 'text-gray-700'}`}>
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Invoice list */}
                <div className="rounded-lg bg-white border overflow-hidden">
                  <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                    <div className="h-2.5 bg-gray-300 rounded w-28" />
                    <div className="h-2 bg-gray-200 rounded w-12" />
                  </div>
                  {[
                    { name: 'TechStart SAS', num: 'FA-2024-002', amount: '12 800 €', days: '62j', color: 'bg-red-500' },
                    { name: 'Innovatech', num: 'FA-2024-005', amount: '9 200 €', days: '45j', color: 'bg-orange-400' },
                    { name: 'Acme Corp', num: 'FA-2024-001', amount: '4 500 €', days: '15j', color: 'bg-yellow-400' },
                    { name: 'Dupont & Fils', num: 'FA-2024-003', amount: '2 300 €', days: '—', color: 'bg-green-500' },
                  ].map((row) => (
                    <div key={row.num} className="flex items-center gap-3 px-3 py-2 border-b last:border-0">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${row.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">{row.name}</div>
                        <div className="text-xs text-gray-400">{row.num}</div>
                      </div>
                      {row.days !== '—' && (
                        <div className="text-xs text-red-500 font-semibold">{row.days}</div>
                      )}
                      <div className="text-xs font-bold text-gray-800">{row.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section id="temoignages" className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Des dirigeants qui ont repris le contrôle de leur trésorerie
            </h2>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {[
              { icon: Shield, label: 'Conforme RGPD', sub: 'Données hébergées en France' },
              { icon: FileText, label: 'Légalement conforme', sub: 'Art. L441-10 Code comm.' },
              { icon: CheckCircle, label: 'SSL / TLS chiffré', sub: 'Connexion sécurisée 256-bit' },
              { icon: Users, label: '+340 entreprises', sub: 'nous font confiance' },
            ].map((badge) => {
              const Icon = badge.icon
              return (
                <div key={badge.label} className="flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3">
                  <Icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{badge.label}</p>
                    <p className="text-xs text-gray-400">{badge.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-xl bg-white border p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">{t.quote}</p>
                <div className="mt-auto">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Tarifs clairs, sans surprise</h2>
            <p className="text-gray-500 mt-3">
              14 jours d&apos;essai gratuit sur tous les plans. Sans carte bancaire.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? 'border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-200'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span className="rounded-full bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5">
                        Populaire
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}€
                    </span>
                    <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-blue-200' : 'text-gray-400'}`}>
                      /{plan.period}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${plan.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                    {plan.desc}
                  </p>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          plan.highlight ? 'text-blue-300' : 'text-blue-600'
                        }`}
                      />
                      <span className={plan.highlight ? 'text-blue-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`block text-center rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Vous recouvrez plus de 1 000 factures / mois ou cherchez une solution sur-mesure ?{' '}
            <a href="mailto:hello@relanceflow.fr" className="text-blue-600 hover:underline font-medium">
              Parlons-en →
            </a>
          </p>
        </div>
      </section>

      {/* GUIDES TEASER */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Guides juridiques gratuits
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                Le droit commercial en clair, sans jargon inutile.
              </p>
            </div>
            <Link
              href="/guides"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Voir tous les guides
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {guides.map((guide, i) => (
              <Link
                key={i}
                href="/guides"
                className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors flex-1">
                  {guide}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>

          {/* Templates lead magnet */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Pack Modèles de Relance Gratuits</h3>
              <p className="text-blue-200 text-sm mt-0.5">
                5 modèles d&apos;emails (cordial, ferme, précontentieux, litige, mise en demeure) — prêts à l&apos;emploi
              </p>
            </div>
            <Link
              href="/modeles"
              className="flex-shrink-0 rounded-xl bg-white text-blue-700 font-bold text-sm px-5 py-2.5 hover:bg-blue-50 transition-colors"
            >
              Télécharger
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Questions fréquentes</h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Votre trésorerie ne peut pas attendre.
          </h2>
          <p className="mt-4 text-lg text-blue-200/80">
            Chaque jour de retard coûte de l&apos;argent. Démarrez gratuitement — sans carte bancaire,
            sans engagement, sans friction.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 text-base transition-all shadow-lg shadow-blue-500/30"
            >
              Démarrer mon essai gratuit — 14 jours
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-300/50">
            Sans carte bancaire · Sans engagement · Annulation en 1 clic
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white py-12 px-4">
        <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">RelanceFlow</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Automatisez votre recouvrement. Récupérez vos créances. Protégez votre trésorerie.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Produit</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#fonctionnalites" className="hover:text-gray-900">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-gray-900">Tarifs</a></li>
              <li><a href="#calculateur" className="hover:text-gray-900">Calculateur DSO</a></li>
              <li><Link href="/modeles" className="hover:text-gray-900">Modèles gratuits</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Ressources</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/guides" className="hover:text-gray-900">Guides juridiques</Link></li>
              <li><Link href="/support" className="hover:text-gray-900">Support</Link></li>
              <li><a href="mailto:hello@relanceflow.fr" className="hover:text-gray-900">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Légal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/cgu" className="hover:text-gray-900">CGU</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">Confidentialité</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-gray-900">Mentions légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl mt-8 pt-6 border-t text-center text-xs text-gray-400">
          © 2026 RelanceFlow — Tous droits réservés · Recouvrement de créances pour TPE/PME françaises
        </div>
      </footer>
    </div>
  )
}
