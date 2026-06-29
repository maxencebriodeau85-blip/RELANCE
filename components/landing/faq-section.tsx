'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: "J'ai seulement quelques factures par mois, est-ce vraiment pour moi ?",
    answer:
      "Oui — c'est même là que tu gagnes le plus. Si tu fais 5 factures par mois, tu n'as pas de logiciel dédié et tu fais tout à la main. Une seule facture impayée à 2 000 € rentabilise un an d'abonnement Starter.",
  },
  {
    question: 'Combien de temps faut-il pour configurer RelanceFlow ?',
    answer:
      "Moins de 5 minutes. Tu crées ton compte, tu importes ton premier CSV de factures (export depuis Pennylane, Sage, QuickBooks…) et tu choisis un scénario de relance préconfiguré. C'est tout.",
  },
  {
    question: 'Mes clients verront-ils que les emails sont automatisés ?',
    answer:
      "Non. Les emails partent depuis ton adresse, signés à ton nom, personnalisés avec les détails exacts de la facture (numéro, montant, échéance, nom du client). Indissociables d'un email manuel.",
  },
  {
    question: 'Puis-je personnaliser les emails de relance ?',
    answer:
      "Oui, à 100 %. Tu modifies le ton, l'objet, le corps, le délai d'envoi, tu ajoutes ta signature… Variables disponibles : {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{days_overdue}}.",
  },
  {
    question: 'La mise en demeure générée est-elle juridiquement valable ?',
    answer:
      "Oui. Conforme à l'article 1344 du Code civil et à l'article L441-10 du Code de commerce, avec calcul automatique des pénalités de retard légales (taux BCE +10 points + indemnité forfaitaire de 40 €). Recommandation : envoi en recommandé avec AR pour preuve probante maximale.",
  },
  {
    question: "Que se passe-t-il après les 30 jours d'essai gratuit ?",
    answer:
      "Rien d'automatique. Tu choisis de souscrire à une formule (à partir de 19 €/mois) ou tu laisses ton compte expirer. Aucune carte bancaire n'est demandée à l'inscription, donc aucun prélèvement surprise.",
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      "Hébergement en Europe (Vercel + Supabase), chiffrement TLS 1.3 en transit et au repos, politiques d'accès strictes (Row Level Security), conformité RGPD. Tu restes propriétaire de toutes tes données et tu peux les exporter à tout moment.",
  },
  {
    question: 'Puis-je résilier à tout moment ?',
    answer:
      "Oui, sans engagement et sans frais. La résiliation prend effet à la fin du mois en cours. Tu gardes l'accès jusqu'à cette date et tu peux exporter toutes tes données.",
  },
  {
    question: 'Existe-t-il une intégration avec mon logiciel comptable ?',
    answer:
      "Pour le moment, l'import se fait par CSV (compatible avec tous les logiciels comptables français). Une intégration native Pennylane est incluse dans le plan Business. D'autres intégrations (Sage, QuickBooks, EBP) arrivent.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Questions fréquentes
          </h2>
          <p className="text-xl text-gray-600">
            Tout ce que vous devez savoir avant de vous lancer
          </p>
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
              Contactez-nous
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
