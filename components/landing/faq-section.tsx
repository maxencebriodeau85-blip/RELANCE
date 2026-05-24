'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'En combien de temps est-ce que je suis opérationnel ?',
    answer:
      'Moins de 5 minutes. Tu crées ton compte, tu ajoutes ton premier contact, tu le glisses dans le pipeline. Les relances automatiques sont actives dès que tu envoies une proposition. Pas d\'onboarding obligatoire — tu découvres en faisant.',
  },
  {
    question: 'Comment fonctionnent les séquences de relance prospects ?',
    answer:
      'Quand tu fais passer un contact en "Proposition envoyée", RelanceFlow déclenche automatiquement une séquence : email J+3 ("Avez-vous pu consulter ?"), email J+7 ("Je reste disponible"), alerte interne J+14 ("Toujours pas de réponse — appeler ?"). Si le prospect répond ou si tu changes son statut, la séquence s\'arrête immédiatement.',
  },
  {
    question: 'Comment fonctionne la facturation ?',
    answer:
      'Depuis un deal signé dans le pipeline, tu cliques "Générer la facture". Le montant est pré-rempli depuis le deal. La facture part par email au client avec un lien de paiement Stripe sécurisé. Quand il paie en ligne, la facture est automatiquement marquée "Payée" dans ton interface. Si impayée, les relances partent à J+7, J+15 et J+30 automatiquement.',
  },
  {
    question: 'Est-ce légal de générer des factures comme ça ?',
    answer:
      'Oui, totalement. RelanceFlow génère des PDFs de factures numériques, comme le font Notion, Word ou n\'importe quel autre outil. La certification ODP (pour la facturation électronique obligatoire 2026) concerne les plateformes qui transmettent des factures au Portail Public de Facturation — pas les outils qui génèrent des PDFs. Tu restes maître de tes factures.',
  },
  {
    question: 'Mes clients verront-ils que les relances sont automatisées ?',
    answer:
      'Non. Les emails partent depuis ton nom, sont rédigés à la première personne, et sont personnalisés avec les détails du deal ou de la facture. Indissociables d\'un email que tu aurais écrit toi-même.',
  },
  {
    question: 'Que se passe-t-il après les 14 jours d\'essai gratuit ?',
    answer:
      'Rien d\'automatique. Tu choisis de continuer à 15 €/mois ou ton compte expire. Aucune carte bancaire n\'est demandée à l\'inscription — zéro prélèvement surprise.',
  },
  {
    question: 'Est-ce que RelanceFlow est adapté si je travaille avec peu de clients ?',
    answer:
      'C\'est exactement pour ça qu\'il a été conçu. Tu n\'as pas besoin de 100 prospects — avec 5 à 15 clients actifs, le pipeline visuel te permet de voir exactement où en est chaque deal et de ne plus rien laisser tomber. Les consultants avec 3 ou 4 gros deals en cours sont souvent ceux qui profitent le plus de l\'outil.',
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      'Hébergement en Europe (Vercel + Supabase), chiffrement TLS 1.3 en transit et au repos, politiques d\'accès strictes (Row Level Security Supabase), conformité RGPD. Tu restes propriétaire de toutes tes données et peux les exporter à tout moment.',
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900">Questions fréquentes</h2>
        <p className="text-gray-500 mt-3">Tout ce que tu dois savoir avant de te lancer</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className={`border rounded-xl overflow-hidden transition-shadow ${
                isOpen ? 'shadow-md border-blue-200' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 pt-0 text-gray-600 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-10">
        <p className="text-gray-500 text-sm">
          Une autre question ?{' '}
          <a href="/support" className="text-blue-600 hover:underline font-medium">
            Contacte-nous
          </a>
        </p>
      </div>
    </>
  )
}
