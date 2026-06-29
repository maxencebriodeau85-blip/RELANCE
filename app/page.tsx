import Link from 'next/link'
import { FAQSection } from '@/components/landing/faq-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { ResultsSection } from '@/components/landing/results-section'
import { ComparisonSection } from '@/components/landing/comparison-section'
import { ProductTourSection } from '@/components/landing/product-tour'
import { SiteFooter } from '@/components/landing/footer'
import { SiteNav } from '@/components/landing/site-nav'
import { TrustStrip } from '@/components/landing/trust-strip'
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Kanban,
  FileText,
  Bell,
  Mail,
  MessageSquare,
  TrendingUp,
  Euro,
  Clock,
  Users,
  Shield,
  X,
} from 'lucide-react'

// ─── data ─────────────────────────────────────────────────────────────────────

const painPoints = [
  {
    wrong: 'Envoyer une proposition et espérer que le prospect rappelle',
    right: 'Séquence auto J+3, J+7, J+14 — si pas de réponse, RelanceFlow relance à ta place',
  },
  {
    wrong: 'Ouvrir 3 fichiers pour savoir où en est chaque deal',
    right: 'Pipeline visuel : tous tes contacts d\'un coup d\'œil, triés par étape',
  },
  {
    wrong: 'Oublier de facturer après avoir signé une mission',
    right: 'La facture se génère en 2 clics depuis le deal signé',
  },
  {
    wrong: 'Relancer manuellement tes clients qui ne paient pas',
    right: 'Relances factures automatiques à J+7, J+15, J+30 — tu n\'as rien à faire',
  },
]

const features = [
  {
    icon: Kanban,
    title: 'Pipeline kanban 5 étapes',
    description: 'Prospect → Qualifié → Proposition → Signé → Perdu. Glisse tes contacts d\'une colonne à l\'autre. Tu vois en 10 secondes où en est chaque deal.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: MessageSquare,
    title: 'Journal d\'activité',
    description: 'Note chaque appel, email ou réunion directement sur la fiche contact. "Appel 12 mai, 8min — intéressé, rappeler après le 20." Tout est horodaté.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Mail,
    title: 'Séquences relance prospects',
    description: 'Quand une proposition part, la séquence se déclenche automatiquement. J+3 : relance douce. J+7 : rappel. J+14 : alerte interne "appeler". Si le prospect répond, tout s\'arrête.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: FileText,
    title: 'Facture en 2 clics',
    description: 'Deal signé → tu cliques "Générer la facture". Le montant est pré-rempli depuis le deal. La facture part par email avec un lien de paiement Stripe en 30 secondes.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Bell,
    title: 'Relances factures auto',
    description: 'Facture impayée à J+7 : premier rappel. J+15 : deuxième relance. J+30 : alerte interne "appeler". Tu encaisses sans courir après ton argent.',
    color: 'bg-red-100 text-red-600',
  },
  {
    icon: TrendingUp,
    title: 'Stats en temps réel',
    description: 'Taux de conversion pipeline, factures en attente, montant encaissé ce mois. Pas de graphiques inutiles — des chiffres lisibles en 10 secondes.',
    color: 'bg-green-100 text-green-600',
  },
]

const steps = [
  { n: 1, label: 'Prospect', color: 'bg-blue-500', sub: 'Premier contact' },
  { n: 2, label: 'Qualifié', color: 'bg-violet-500', sub: 'Besoin confirmé' },
  { n: 3, label: 'Proposition', color: 'bg-amber-500', sub: '→ relances J+3/7/14' },
  { n: 4, label: 'Signé', color: 'bg-green-500', sub: '→ facture auto' },
  { n: 5, label: 'Payé', color: 'bg-emerald-600', sub: '→ relances J+7/15/30' },
]


const comparison = [
  { feature: 'Pipeline visuel', rf: true, hub: true, pipe: true },
  { feature: 'Relances prospects auto', rf: true, hub: '💰 Cher', pipe: false },
  { feature: 'Facturation intégrée', rf: true, hub: false, pipe: false },
  { feature: 'Relances factures auto', rf: true, hub: false, pipe: false },
  { feature: 'En français natif', rf: true, hub: false, pipe: false },
  { feature: 'Paiement en ligne intégré', rf: true, hub: false, pipe: false },
  { feature: 'Prix / mois', rf: 'dès 19 €', hub: '41 €', pipe: '20 €' },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <SiteNav />

      {/* HERO */}
      <section id="main-content" className="relative bg-gradient-to-b from-brand-950 via-[#1a1656] to-brand-900 pt-20 pb-28 px-4 overflow-hidden">
        {/* Brand orbs */}
        <div className="brand-orb bg-brand-500/40 h-[340px] w-[340px] -top-20 -left-32" />
        <div className="brand-orb bg-fuchsia-500/30 h-[420px] w-[420px] top-10 -right-40" />
        <div className="brand-orb bg-amber-400/20 h-[260px] w-[260px] bottom-0 left-1/3" />

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid opacity-30" />

        <div className="mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-4 py-1.5 text-sm text-white/80 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Pour indépendants français · Essai gratuit 30 jours · Sans CB
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight text-balance">
            Arrête de courir{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-fuchsia-300 to-brand-300">
              après ton argent.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed text-pretty">
            RelanceFlow relance tes factures impayées tout seul — séquences automatiques,
            lien de paiement Stripe, mise en demeure légale prête à envoyer.{' '}
            <strong className="text-white">Pensé pour les indépendants qui bossent seuls.</strong>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-bold px-7 py-3.5 text-base transition-all shadow-xl shadow-brand-500/40 hover:shadow-2xl hover:scale-[1.02]"
            >
              Démarrer gratuitement — 30 jours
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#produit"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur text-white/80 hover:text-white hover:border-white/40 font-medium px-6 py-3.5 text-base transition-all"
            >
              Voir le produit en 30 s
              <ChevronRight className="h-5 w-5" />
            </a>
          </div>

          <p className="mt-5 text-sm text-white/40">
            Sans carte bancaire · Données hébergées en Europe · Annulation en 1 clic
          </p>

          {/* Mini stats — only what is verifiable about the product itself.
              No fabricated "X% DSO observed on Y users" — those return when
              measured on real, nameable customers. */}
          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-12 max-w-lg mx-auto">
            {[
              { value: '< 60 s', label: 'pour créer une facture' },
              { value: '100 %', label: 'français · RGPD · Europe' },
              { value: 'dès 19 €', label: '/mois après 30 j gratuits' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <TrustStrip />

      {/* PAIN POINTS */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Tu gères ton business seul. C&apos;est là que ça coince.
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Sans outil dédié, les deals s&apos;accumulent dans ta tête, les factures traînent,
              et les relances partent trop tard — ou pas du tout.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {painPoints.map((p, i) => (
              <div key={i} className="rounded-xl bg-white border p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100 mt-0.5">
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <p className="text-sm text-gray-400 line-through">{p.wrong}</p>
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

      {/* PRODUCT TOUR — Le produit en 3 écrans */}
      <ProductTourSection />

      {/* RESULTS — Avant/Après chiffrés */}
      <ResultsSection />

      {/* HOW IT WORKS — La boucle complète */}
      <section id="comment-ca-marche" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 mb-4 uppercase tracking-wider">
              La boucle complète
            </span>
            <h2 className="text-3xl font-bold text-gray-900">
              Du premier contact à l&apos;encaissement — sans intervention manuelle
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              RelanceFlow est le seul outil qui connecte ton pipeline commercial,
              ta facturation et tes relances impayées dans une seule interface.
            </p>
          </div>

          {/* Flow diagram */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-stretch gap-0 rounded-2xl overflow-hidden border shadow-lg">
              {steps.map((step, i) => (
                <div
                  key={step.n}
                  className="flex-1 relative"
                >
                  <div className={`h-1.5 w-full ${step.color}`} />
                  <div className="bg-white p-5">
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${step.color} text-white text-sm font-bold mb-3`}>
                      {step.n}
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{step.label}</p>
                    <p className="text-xs text-gray-400 mt-1 leading-tight">{step.sub}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-gray-100 border border-gray-200">
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Auto-trigger callouts */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                <Bell className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Relances prospects automatiques</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Dès qu&apos;une proposition est envoyée → J+3, J+7, J+14. La séquence s&apos;arrête si le prospect répond.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                <Euro className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Relances factures automatiques</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Facture impayée → relances à J+7, J+15, J+30 avec lien de paiement Stripe. Tu n&apos;as rien à faire.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              Tout ce qu&apos;il faut, rien de superflu
            </h2>
            <p className="text-gray-500 mt-3">
              Conçu pour les consultants et coaches qui travaillent seuls et n&apos;ont pas de temps à perdre.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-xl bg-white border p-6 flex flex-col gap-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                    <Icon className="h-5 w-5" />
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

      {/* MOCKUP — Pipeline kanban */}
      <section className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Tous tes deals visibles en un coup d&apos;œil
            </h2>
            <p className="text-gray-500 mt-3">
              Ajoute un contact en moins de 60 secondes. Glisse-dépose les cartes d&apos;une colonne à l&apos;autre.
            </p>
          </div>

          {/* Kanban mockup */}
          <div className="relative rounded-2xl border shadow-2xl overflow-hidden bg-gray-50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b bg-gray-100 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3">
                <div className="rounded bg-white border px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto text-center">
                  relanceflow.fr/dashboard/pipeline
                </div>
              </div>
            </div>

            <div className="flex">
              {/* Sidebar mock */}
              <div className="w-44 bg-white border-r p-3 hidden sm:block flex-shrink-0">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-5 w-5 rounded bg-blue-600 flex-shrink-0" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
                {[
                  { label: 'Tableau de bord', active: false },
                  { label: 'Pipeline', active: true },
                  { label: 'Factures', active: false },
                  { label: 'Statistiques', active: false },
                  { label: 'Paramètres', active: false },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded mb-0.5 ${item.active ? 'bg-blue-600' : ''}`}>
                    <div className={`h-3 w-3 rounded ${item.active ? 'bg-blue-400' : 'bg-gray-200'}`} />
                    <div className={`h-2 rounded ${item.active ? 'bg-blue-400 w-16' : 'bg-gray-100 w-14'}`} />
                  </div>
                ))}
              </div>

              {/* Kanban columns */}
              <div className="flex-1 p-4 overflow-x-auto">
                <div className="flex gap-3 min-w-max">
                  {[
                    {
                      label: 'Prospect', color: 'bg-blue-500', count: 3,
                      cards: [
                        { name: 'Marie Dupont', co: 'Coaching RH', tag: 'Coach', days: null },
                        { name: 'Thomas L.', co: 'Indépendant', tag: 'Consultant', days: null },
                      ],
                    },
                    {
                      label: 'Qualifié', color: 'bg-violet-500', count: 2,
                      cards: [
                        { name: 'Acme Corp', co: 'Dir. Marketing', tag: '8 500 €', days: null },
                      ],
                    },
                    {
                      label: 'Proposition', color: 'bg-amber-500', count: 2,
                      cards: [
                        { name: 'TechStart', co: 'CEO', tag: '12 000 €', days: 'J+3 ✓' },
                        { name: 'Nexus Agency', co: 'DRH', tag: '6 200 €', days: 'J+7 →' },
                      ],
                    },
                    {
                      label: 'Signé', color: 'bg-green-500', count: 1,
                      cards: [
                        { name: 'Innovatech', co: 'Fondateur', tag: '9 500 €', days: '📄 Facture' },
                      ],
                    },
                  ].map((col) => (
                    <div key={col.label} className="w-44 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${col.color}`} />
                          <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">{col.count}</span>
                      </div>
                      <div className="space-y-2">
                        {col.cards.map((card) => (
                          <div key={card.name} className="rounded-lg bg-white border p-2.5 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-800 truncate">{card.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">{card.co}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${card.tag.includes('€') ? 'bg-green-50 text-green-700' : card.tag === '📄 Facture' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                {card.tag}
                              </span>
                              {card.days && (
                                <span className={`text-xs font-medium ${card.days.includes('✓') ? 'text-amber-600' : 'text-amber-500'}`}>
                                  {card.days}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="rounded-lg border border-dashed border-gray-200 p-2 text-center">
                          <span className="text-xs text-gray-300">+ Ajouter</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ADOPTERS — honnête, pas de faux témoignages */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 mb-4 uppercase tracking-wider">
              Accès en avant-première
            </span>
            <h2 className="text-3xl font-bold text-gray-900">
              Tu es parmi les premiers
            </h2>
            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              RelanceFlow est jeune. On cherche les indépendants français qui veulent un outil
              qui marche — et qui acceptent qu&apos;il évolue avec leurs retours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {[
              { icon: Clock, title: '30 jours gratuits', sub: 'Accès complet immédiat, sans carte bancaire.' },
              { icon: MessageSquare, title: 'Feedback direct au fondateur', sub: 'Tu écris, tu as une réponse. Pas de chatbot, pas de niveau 1.' },
              { icon: Euro, title: 'Tarif fondateur garanti à vie', sub: 'Si tu souscris maintenant, ton prix ne bougera jamais.' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="rounded-xl bg-white border p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Shield, label: 'Conforme RGPD', sub: 'Données hébergées en Europe' },
              { icon: CheckCircle, label: 'SSL / TLS chiffré', sub: 'Connexion sécurisée 256-bit' },
              { icon: Users, label: 'Pour indépendants', sub: 'Consultants, coaches, freelances' },
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
        </div>
      </section>

      {/* COMPARISON */}
      <ComparisonSection />

      {/* TESTIMONIALS */}
      <TestimonialsSection />

      {/* PRICING */}
      <PricingSection />

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-3xl">
          <FAQSection />
        </div>
      </section>

      {/* FOUNDER CLOSE — humain, pas un 3ème CTA identique */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold text-white">
            M
          </div>
          <p className="text-lg sm:text-xl text-blue-100 leading-relaxed italic max-w-xl mx-auto">
            &ldquo;Je l&apos;ai construit parce que j&apos;avais marre de perdre des deals par oubli —
            et de passer mes soirées à relancer manuellement. Si tu te reconnais, l&apos;essai est gratuit.&rdquo;
          </p>
          <p className="mt-4 text-sm text-blue-300/70 font-semibold">
            Maxence — créateur de RelanceFlow
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-bold px-8 py-4 text-base transition-all shadow-xl shadow-brand-500/40 hover:scale-[1.02]"
            >
              Bloquer mon tarif fondateur
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="mailto:hello@relanceflow.fr"
              className="flex items-center gap-2 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-medium px-6 py-4 text-base transition-all"
            >
              Poser une question →
            </a>
          </div>
          <p className="mt-4 text-sm text-blue-300/40">
            Sans carte bancaire · Feedback bienvenu · à partir de 19 €/mois
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  )
}
