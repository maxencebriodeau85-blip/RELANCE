import Link from 'next/link'
import { ArrowLeft, FileText, Clock, ChevronRight, Scale, Euro, AlertTriangle, Download } from 'lucide-react'

const guides = [
  {
    slug: 'indemnite-forfaitaire-40-euros',
    title: "L'indemnité forfaitaire de 40€ : comment l'appliquer sans fâcher vos clients",
    desc: "Depuis le décret du 2 octobre 2012, toute créance professionnelle impayée ouvre droit à une indemnité forfaitaire de 40€ par facture. On vous explique comment la réclamer légalement tout en préservant la relation commerciale.",
    readTime: '5 min',
    category: 'Droit commercial',
    icon: Euro,
  },
  {
    slug: 'penalites-retard-calcul',
    title: "Pénalités de retard légales : calcul, taux Banque Centrale Européenne et mise en œuvre en 2026",
    desc: "Le taux légal des pénalités de retard est de 3 fois le taux d'intérêt légal (art. L441-10 Code comm.). Voici comment calculer le montant exact, le faire figurer sur vos factures et le réclamer sans procédure.",
    readTime: '7 min',
    category: 'Droit commercial',
    icon: Scale,
  },
  {
    slug: 'mise-en-demeure-guide-complet',
    title: "Mise en demeure : modèle, délais légaux et effets juridiques — guide complet",
    desc: "La mise en demeure est le dernier recours avant la procédure judiciaire. Elle fait courir les intérêts moratoires et constitue une preuve de votre démarche amiable. On vous donne le modèle exact et les mentions obligatoires.",
    readTime: '8 min',
    category: 'Procédure',
    icon: AlertTriangle,
  },
  {
    slug: 'dso-tresorerie-comment-reduire',
    title: "DSO : pourquoi 45 jours tuent votre trésorerie (et comment le réduire à 28j)",
    desc: "Le Days Sales Outstanding mesure le délai moyen de paiement de vos clients. La moyenne française est de 52 jours — soit des dizaines de milliers d'euros immobilisés. Stratégies concrètes pour le réduire durablement.",
    readTime: '6 min',
    category: 'Trésorerie',
    icon: Euro,
  },
  {
    slug: 'recouvrement-amiable-vs-contentieux',
    title: "Recouvrement amiable vs contentieux : quand passer le cap et comment choisir",
    desc: "L'injonction de payer, la procédure participative, le référé-provision... Quelles sont vos options au-delà du recouvrement amiable ? À quel moment déclencher une action en justice sans y perdre plus que vous ne récupérerez ?",
    readTime: '9 min',
    category: 'Procédure',
    icon: Scale,
  },
  {
    slug: 'conditions-generales-vente-recouvrement',
    title: "CGV et recouvrement : les 5 clauses obligatoires qui vous protègent",
    desc: "Des CGV bien rédigées sont votre première ligne de défense. Pénalités de retard, clause résolutoire, clause de réserve de propriété, compétence juridictionnelle... les 5 clauses que vous devez avoir.",
    readTime: '6 min',
    category: 'Droit commercial',
    icon: FileText,
  },
  {
    slug: 'injonction-payer-mode-emploi',
    title: "Injonction de payer : mode d'emploi complet (formulaire Cerfa, délais, coûts)",
    desc: "La procédure la plus rapide pour obtenir un titre exécutoire contre un débiteur récalcitrant. On vous guide pas à pas : compétence du tribunal, formulaire CERFA 12.948*06, délais et frais réels.",
    readTime: '10 min',
    category: 'Procédure',
    icon: Scale,
  },
  {
    slug: 'prescription-creances-commerciales',
    title: "Prescription des créances commerciales : les délais à ne surtout pas rater",
    desc: "En matière commerciale, le délai de prescription de droit commun est de 5 ans (art. L110-4 Code comm.). Mais des délais plus courts peuvent s'appliquer selon la nature de la créance. Ne laissez pas vos droits s'éteindre.",
    readTime: '5 min',
    category: 'Droit commercial',
    icon: Clock,
  },
  {
    slug: 'relance-clients-ton-progressif',
    title: "Comment relancer un client sans abîmer la relation : le protocole en 4 étapes",
    desc: "Trop doux, vous passez pour le banquier de votre client. Trop agressif, vous perdez le contrat. Le protocole de relance progressive qui récupère vos créances tout en préservant les relations commerciales durables.",
    readTime: '5 min',
    category: 'Pratique',
    icon: FileText,
  },
  {
    slug: 'rapport-banquier-poste-client',
    title: "Comment présenter votre poste client à votre banquier pour obtenir un prêt",
    desc: "Une balance âgée saine et un DSO maîtrisé sont des arguments de poids pour négocier une ligne de trésorerie. On vous montre comment structurer le rapport que votre banquier attend.",
    readTime: '7 min',
    category: 'Trésorerie',
    icon: Euro,
  },
]

const categoryColors: Record<string, string> = {
  'Droit commercial': 'bg-blue-100 text-blue-700',
  'Procédure': 'bg-orange-100 text-orange-700',
  'Trésorerie': 'bg-green-100 text-green-700',
  'Pratique': 'bg-purple-100 text-purple-700',
}

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            RelanceFlow
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Essai gratuit 14j
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 space-y-10">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 mb-5">
            <Scale className="h-4 w-4" />
            Ressources juridiques gratuites
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Guides recouvrement & droit commercial
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Le droit du recouvrement en clair, sans jargon inutile. 10 guides rédigés par des
            professionnels du credit management pour vous aider à récupérer vos créances légalement
            et efficacement.
          </p>
        </div>

        {/* Lead magnet banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Pack Modèles de Relance Gratuits</h3>
            <p className="text-blue-200 text-sm mt-0.5">
              5 modèles d&apos;emails prêts à l&apos;emploi (cordial, ferme, précontentieux, litige, mise en demeure) — téléchargement immédiat
            </p>
          </div>
          <Link
            href="/modeles"
            className="flex-shrink-0 rounded-xl bg-white text-blue-700 font-bold text-sm px-5 py-2.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            Télécharger gratuitement
          </Link>
        </div>

        {/* Guides grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {guides.map((guide, i) => {
            const Icon = guide.icon
            return (
              <div
                key={guide.slug}
                className="rounded-xl border bg-white p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${categoryColors[guide.category]?.replace('text-', 'text-').split(' ')[0] || 'bg-gray-100'}`}>
                    <Icon className={`h-4.5 w-4.5 ${categoryColors[guide.category]?.split(' ')[1] || 'text-gray-600'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryColors[guide.category] || 'bg-gray-100 text-gray-600'}`}>
                      {guide.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {guide.readTime}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug">
                    {guide.title}
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">{guide.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border bg-white p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Vous avez lu les guides. Passez à l&apos;action.
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            RelanceFlow automatise tout ce que vous venez d&apos;apprendre — relances, pénalités de retard,
            mise en demeure — en quelques minutes.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 transition-colors"
          >
            Démarrer l&apos;essai gratuit — 14 jours
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-3">Sans carte bancaire · Sans engagement</p>
        </div>
      </div>
    </div>
  )
}
