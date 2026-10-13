import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/legal-layout'
import { ContactLink } from '@/components/legal/legal-field'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, PUBLISHER, SUBPROCESSORS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Accord de sous-traitance des données',
  description:
    'Engagements d’Encair, sous-traitant au sens de l’article 28 du RGPD, pour les données des débiteurs importées par ses clients.',
  alternates: { canonical: '/dpa' },
}

export default function DpaPage() {
  return (
    <LegalLayout title="Accord de sous-traitance des données" lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        Cet accord, conclu en application de l’article 28 du RGPD, fait partie des{' '}
        <a href="/cgu">conditions générales</a>. Il s’applique aux données personnelles que le
        Client importe ou saisit dans Encair au sujet de ses propres clients (les « Débiteurs »).
        Pour ces données, le Client est responsable de traitement et {PUBLISHER.name}, éditeur
        d’Encair, est sous-traitant.
      </p>

      <h2>1. Objet, durée et nature du traitement</h2>
      <ul>
        <li>
          <strong>Objet</strong> : suivi des factures impayées du Client et envoi, sur son
          instruction, de relances par email à ses Débiteurs.
        </li>
        <li>
          <strong>Durée</strong> : la durée de l’abonnement ou de l’essai, puis la période de
          restitution et de suppression prévue à l’article 7.
        </li>
        <li>
          <strong>Opérations</strong> : enregistrement, conservation, consultation, mise à jour,
          envoi d’emails, export et suppression.
        </li>
      </ul>

      <h2>2. Données et personnes concernées</h2>
      <ul>
        <li>
          <strong>Personnes</strong> : les Débiteurs du Client et, le cas échéant, leurs
          interlocuteurs.
        </li>
        <li>
          <strong>Données</strong> : nom ou raison sociale, adresse email, numéros, montants et
          échéances des factures, soldes, promesses de paiement, litiges, notes saisies par le
          Client et historique des relances.
        </li>
      </ul>
      <p>
        Le Client s’engage à ne pas importer de données sensibles au sens de l’article 9 du
        RGPD.
      </p>

      <h2>3. Engagements d’Encair</h2>
      <ul>
        <li>Traiter les données uniquement sur instruction documentée du Client, c’est-à-dire
          par l’usage qu’il fait du Service.</li>
        <li>Garantir la confidentialité des données ; seul l’éditeur y a accès, et uniquement
          lorsque c’est nécessaire au support ou à la sécurité.</li>
        <li>Mettre en œuvre des mesures de sécurité adaptées : chiffrement des échanges et des
          données au repos, cloisonnement des comptes par des règles d’accès en base de
          données, journalisation.</li>
        <li>Aider le Client à répondre aux demandes d’exercice de droits des Débiteurs et lui
          transmettre sans délai celles qu’Encair reçoit directement.</li>
        <li>Notifier au Client toute violation de données le concernant dans les meilleurs
          délais, et au plus tard 48 heures après en avoir pris connaissance.</li>
        <li>Aider le Client, dans la mesure du possible, pour ses analyses d’impact et ses
          échanges avec la CNIL.</li>
        <li>Mettre à disposition les informations nécessaires pour démontrer le respect de cet
          accord et permettre des audits, sur demande écrite et avec un préavis raisonnable.</li>
      </ul>

      <h2>4. Engagements du Client</h2>
      <ul>
        <li>Disposer d’une base légale pour traiter les données de ses Débiteurs et les informer
          de ce traitement (article 14 du RGPD).</li>
        <li>Vérifier l’exactitude des données importées et le contenu des relances avant envoi.</li>
      </ul>

      <h2>5. Sous-traitants ultérieurs</h2>
      <p>
        Le Client autorise Encair à recourir aux sous-traitants ultérieurs suivants, liés par
        des obligations équivalentes à celles du présent accord :
      </p>
      <ul>
        {SUBPROCESSORS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> ({p.country}) — {p.purpose} — {p.location} — {p.safeguard}
          </li>
        ))}
      </ul>
      <p>
        Encair informe le Client par email de tout ajout ou remplacement au moins 30 jours à
        l’avance. Le Client peut s’y opposer en résiliant son abonnement avant cette date.
      </p>

      <h2>6. Transferts hors Union européenne</h2>
      <p>
        Lorsque des données sont accessibles depuis un pays tiers, le transfert est encadré par
        une décision d’adéquation (Data Privacy Framework UE–États-Unis) ou par les clauses
        contractuelles types de la Commission européenne.
      </p>

      <h2>7. Fin du contrat</h2>
      <p>
        À la fin du contrat, le Client peut exporter ses données pendant 30 jours. Encair
        supprime ensuite les données des Débiteurs dans un délai de 90 jours, copies de
        sauvegarde comprises, sauf obligation légale de conservation.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question sur cet accord : <ContactLink email={CONTACT_EMAIL} />.
      </p>
    </LegalLayout>
  )
}
