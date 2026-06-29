import Link from 'next/link'
import { Download, Mail, AlertTriangle, CheckCircle, Copy, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { SiteFooter } from '@/components/landing/footer'

const templates = [
  {
    id: 'cordial',
    title: 'Relance cordiale — J+7',
    tone: 'Cordial',
    toneColor: 'bg-blue-100 text-blue-700',
    context: "Pour un retard de moins de 15 jours. Suppose un simple oubli. Préserve la relation.",
    subject: 'Rappel : Facture n°{NUMERO_FACTURE} — Échéance du {DATE_ECHEANCE}',
    body: `Madame, Monsieur,

Sauf erreur ou omission de notre part, notre facture n°{NUMERO_FACTURE} d'un montant de {MONTANT} TTC, dont l'échéance était fixée au {DATE_ECHEANCE}, n'a pas encore été réglée à ce jour.

Nous vous remercions de bien vouloir procéder au règlement de cette somme dans les meilleurs délais, ou de nous contacter si vous avez la moindre question concernant cette facture.

Dans l'attente de votre retour, nous vous adressons nos cordiales salutations.

{NOM_ENTREPRISE}
{NOM_SIGNATAIRE}`,
  },
  {
    id: 'ferme',
    title: 'Relance ferme — J+21',
    tone: 'Ferme',
    toneColor: 'bg-yellow-100 text-yellow-700',
    context: "Pour un retard de 15 à 30 jours. Rappel explicite des conséquences légales.",
    subject: '2ème relance — Facture n°{NUMERO_FACTURE} impayée',
    body: `Madame, Monsieur,

Par notre précédent courrier du {DATE_PREMIERE_RELANCE}, nous vous avons rappelé l'existence de notre facture n°{NUMERO_FACTURE} d'un montant de {MONTANT} TTC, demeurée impayée à ce jour.

Malgré ce rappel, nous constatons qu'aucun règlement n'est intervenu.

Nous vous demandons de bien vouloir nous faire parvenir votre règlement de {MONTANT} TTC sous 8 jours à compter de la présente.

À défaut, nous serons contraints de faire valoir nos droits par toute voie de recours appropriée, et notamment le recouvrement des pénalités de retard prévues aux conditions générales de vente, au taux légal de {TAUX_PENALITES}% l'an, ainsi que l'indemnité forfaitaire de recouvrement de 40€.

Veuillez agréer nos salutations distinguées.

{NOM_ENTREPRISE}
{NOM_SIGNATAIRE}`,
  },
  {
    id: 'precontentieux',
    title: 'Relance pré-contentieuse — J+45',
    tone: 'Pré-contentieux',
    toneColor: 'bg-orange-100 text-orange-700',
    context: "Pour un retard de 30 à 60 jours. Dernier avertissement avant mise en demeure.",
    subject: 'URGENT — Facture n°{NUMERO_FACTURE} — Avant toute procédure judiciaire',
    body: `Madame, Monsieur,

Malgré nos relances des {DATE_RELANCE_1} et {DATE_RELANCE_2}, la facture n°{NUMERO_FACTURE} d'un montant de {MONTANT} TTC demeure impayée.

Cette situation nous contraint à vous informer que, sans règlement de votre part sous 72 heures, nous serons dans l'obligation de :

1. Émettre une mise en demeure officielle par courrier recommandé avec accusé de réception
2. Réclamer les pénalités de retard au taux légal ({TAUX_PENALITES}% l'an) depuis le {DATE_ECHEANCE}
3. Facturer l'indemnité forfaitaire légale de recouvrement de 40€ par facture impayée
4. Engager une procédure d'injonction de payer devant le Tribunal compétent

Nous regrettons d'en arriver là et restons disponibles pour tout arrangement amiable.

{NOM_ENTREPRISE}
{NOM_SIGNATAIRE}`,
  },
  {
    id: 'litige',
    title: 'Email en cas de contestation — J+30',
    tone: 'Litige',
    toneColor: 'bg-red-100 text-red-700',
    context: "Lorsque le client conteste la prestation ou la facture. Réponse structurée.",
    subject: 'Réponse à votre contestation — Facture n°{NUMERO_FACTURE}',
    body: `Madame, Monsieur,

Nous avons bien pris note de votre contestation concernant notre facture n°{NUMERO_FACTURE}.

Après examen de votre courrier, nous maintenant notre position pour les raisons suivantes :

{ARGUMENTS_DEFENSE}

Conformément à l'article 1344 du Code civil, la contestation d'une créance ne suspend pas l'obligation de paiement. Le règlement de la partie non contestée ({MONTANT_NON_CONTESTE}) doit donc intervenir immédiatement.

Pour la partie contestée, nous vous proposons :
☐ Un rendez-vous de médiation sous 15 jours
☐ Un avoir partiel de {MONTANT_AVOIR}
☐ Le recours à un médiateur agréé

Sans réponse de votre part sous 10 jours, nous serons contraints d'engager une procédure judiciaire.

{NOM_ENTREPRISE}
{NOM_SIGNATAIRE}`,
  },
  {
    id: 'mise-en-demeure',
    title: 'Mise en demeure — J+60',
    tone: 'Mise en demeure',
    toneColor: 'bg-red-100 text-red-800',
    context: "Document légal officiel. À envoyer par LRAR. Fait courir les intérêts moratoires.",
    subject: 'MISE EN DEMEURE — Facture n°{NUMERO_FACTURE} — {MONTANT} TTC',
    body: `MISE EN DEMEURE

Envoyée par lettre recommandée avec accusé de réception

{NOM_ENTREPRISE}, société {FORME_JURIDIQUE} au capital de {CAPITAL}€, immatriculée au RCS de {VILLE_RCS} sous le numéro {SIREN}, dont le siège social est situé {ADRESSE},

Représentée par {NOM_SIGNATAIRE}, en sa qualité de {QUALITE},

A

{NOM_CLIENT}, société {FORME_JURIDIQUE_CLIENT}, immatriculée sous le numéro SIREN {SIREN_CLIENT}, dont le siège social est situé {ADRESSE_CLIENT},

---

OBJET : Mise en demeure de payer

Madame, Monsieur,

Par la présente lettre recommandée avec accusé de réception, nous vous mettons en demeure de régler, dans un délai de 8 jours à compter de la réception de ce courrier, la somme de {MONTANT} TTC correspondant à notre facture n°{NUMERO_FACTURE} du {DATE_FACTURE}, dont l'échéance était fixée au {DATE_ECHEANCE}.

À ce montant s'ajoutent :
- Pénalités de retard au taux de {TAUX_PENALITES}% l'an depuis le {DATE_ECHEANCE} : {MONTANT_PENALITES}€
- Indemnité forfaitaire de recouvrement : 40,00€ (décret n°2012-1115 du 2 octobre 2012)

TOTAL DÛ : {TOTAL_DU}€

À défaut de règlement sous ce délai, nous nous réservons le droit de :
- Engager toute procédure judiciaire utile au recouvrement de notre créance
- Saisir le Tribunal de Commerce de {JURIDICTION} compétent
- Réclamer le remboursement des frais de procédure sur le fondement de l'article 700 du CPC

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Fait à {VILLE}, le {DATE}

{NOM_SIGNATAIRE}
{QUALITE}

Lu et approuvé — Signature :`,
  },
]

export default function ModelesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/auth/register"
            className="rounded-lg bg-brand-gradient text-white text-sm font-semibold px-4 py-2 transition-all hover:shadow-md hover:scale-[1.02]"
          >
            Essai gratuit 30j
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold px-4 py-1.5 mb-5">
            <Download className="h-4 w-4" />
            5 modèles gratuits — téléchargement immédiat
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Modèles de lettres de relance
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            5 modèles prêts à l&apos;emploi, rédigés par des professionnels du credit management.
            De la relance cordiale à la mise en demeure légale.
          </p>
        </div>

        {/* Automation upsell */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-white">
              Envoyez ces modèles automatiquement avec RelanceFlow
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              Fini le copier-coller manuel. RelanceFlow déclenche le bon modèle au bon moment, personnalisé avec les données exactes de chaque facture.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="flex-shrink-0 rounded-xl bg-white text-blue-700 font-bold text-sm px-5 py-2.5 hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            Automatiser maintenant
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Templates */}
        <div className="space-y-5">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">{tpl.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.context}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${tpl.toneColor}`}>
                  {tpl.tone}
                </span>
              </div>

              {/* Subject */}
              <div className="px-6 py-3 border-b bg-blue-50/50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2">Objet :</span>
                <span className="text-sm text-gray-800 font-medium">{tpl.subject}</span>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {tpl.body}
                </pre>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Conforme droit français — Gratuit & libre de droits
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Variables entre {'{}'} à remplacer</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="rounded-2xl border bg-white p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Arrêtez de copier-coller. Automatisez.
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            RelanceFlow remplace toutes les variables automatiquement et envoie le bon email au bon moment — sans que vous ayez à lever le petit doigt.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-bold px-6 py-3 transition-all hover:shadow-lg hover:shadow-brand-500/30"
          >
            Automatiser mes relances — Gratuit 30j
            <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-3">Sans carte bancaire · Sans engagement</p>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
