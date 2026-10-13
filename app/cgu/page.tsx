import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/legal-layout'
import { ContactLink, LegalField } from '@/components/legal/legal-field'
import { OFFER } from '@/lib/plans'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, PUBLISHER, TERMS_VERSION, VAT_MENTION } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation et de vente',
  description:
    'Conditions générales d’utilisation et de vente du logiciel Encair : essai, tarif fondateur, paiement, résiliation, responsabilités.',
  alternates: { canonical: '/cgu' },
}

export default function CGUPage() {
  return (
    <LegalLayout
      title="Conditions générales d’utilisation et de vente"
      lastUpdated={`${LEGAL_LAST_UPDATED} (version ${TERMS_VERSION})`}
    >
      <p>
        Les présentes conditions générales (les « Conditions ») régissent l’utilisation et la
        vente du logiciel Encair (le « Service »), édité par {PUBLISHER.name},{' '}
        {PUBLISHER.legalForm}, SIREN <LegalField value={PUBLISHER.siren} />, dont
        les coordonnées figurent dans les <a href="/mentions-legales">mentions légales</a>{' '}
        (l’« Éditeur »). Elles s’appliquent à toute personne qui crée un compte (le « Client »).
      </p>

      <h2>1. Objet et clients concernés</h2>
      <p>
        Encair est un logiciel en ligne de suivi des factures impayées. Il permet d’importer des
        factures établies dans un autre logiciel, d’actualiser leurs soldes, de suivre les
        promesses de paiement, les paiements partiels et les litiges, et de préparer des relances
        par email que le Client valide.
      </p>
      <p>
        Le Service est réservé aux professionnels agissant pour les besoins de leur activité. Le
        Client le confirme à l’inscription. Sauf disposition impérative contraire, les règles du
        Code de la consommation ne s’appliquent donc pas aux présentes Conditions.
      </p>

      <h2>2. Définitions</h2>
      <ul>
        <li>
          <strong>Débiteurs</strong> : les clients du Client, dont les factures sont suivies dans
          Encair.
        </li>
        <li>
          <strong>Nouvelle facture</strong> : une facture ajoutée pour la première fois dans le
          compte, par import ou saisie. L’actualisation d’une facture déjà suivie (solde,
          promesse, litige) n’est pas une nouvelle facture.
        </li>
      </ul>

      <h2>3. Compte</h2>
      <p>
        Le Client fournit des informations exactes et les tient à jour. Le compte est personnel
        et réservé à un seul utilisateur. Le Client est responsable de la confidentialité de ses
        identifiants et des actions effectuées depuis son compte.
      </p>

      <h2>4. Essai gratuit</h2>
      <p>
        Tout nouveau compte bénéficie d’un essai gratuit de {OFFER.trialDays} jours, sans carte
        bancaire, dans la limite de {OFFER.trialInvoiceLimit} nouvelles factures par mois civil.
      </p>
      <p>
        À la fin de l’essai, aucun prélèvement n’a lieu. Sans abonnement, les relances sont
        suspendues et aucune nouvelle facture ne peut être ajoutée ; le Client conserve l’accès
        en consultation à ses données et peut les exporter au format CSV. Les données d’un essai
        non converti sont supprimées six mois après la fin de l’essai.
      </p>

      <h2>5. Offre et prix</h2>
      <p>
        L’offre fondateur est proposée à <strong>{OFFER.price} € HT par mois</strong> (
        {VAT_MENTION}). Elle comprend un utilisateur et {OFFER.invoiceLimit} nouvelles factures
        par mois civil. Au-delà, l’ajout de nouvelles factures est bloqué jusqu’au premier jour
        du mois suivant ; aucun supplément n’est facturé. L’actualisation des factures déjà
        suivies n’est pas limitée.
      </p>
      <p>
        Le tarif fondateur est garanti au Client tant que son abonnement reste actif sans
        interruption, y compris lorsque le Service évolue et lorsque le tarif public, prévu à{' '}
        {OFFER.publicPrice} € HT par mois, s’appliquera aux nouveaux clients. Il est perdu en cas
        de résiliation, ou de suspension pour défaut de paiement non régularisé dans le délai
        prévu à l’article 6. L’Éditeur peut mettre fin à l’offre fondateur pour les nouvelles
        souscriptions à tout moment, en l’annonçant sur le site.
      </p>

      <h2>6. Paiement</h2>
      <p>
        L’abonnement est payable mensuellement et d’avance, par carte bancaire, via le
        prestataire de paiement Stripe. Une facture est émise à chaque échéance et mise à
        disposition du Client par email.
      </p>
      <p>
        En cas d’échec de paiement, de nouvelles tentatives sont effectuées et le Client en est
        informé. Si le paiement n’est pas régularisé dans les 15 jours, l’accès au Service est
        suspendu dans les conditions de l’article 4 (consultation et export maintenus).
      </p>
      <p>
        Toute somme non payée à l’échéance porte de plein droit des pénalités de retard au taux
        appliqué par la Banque centrale européenne à son opération de refinancement la plus
        récente, majoré de 10 points, ainsi qu’une indemnité forfaitaire pour frais de
        recouvrement de 40 € (articles L441-10 et D441-5 du Code de commerce). Aucun escompte
        n’est accordé en cas de paiement anticipé.
      </p>

      <h2>7. Durée, résiliation et fin du Service</h2>
      <p>
        L’abonnement est mensuel, sans engagement, et se renouvelle automatiquement chaque mois.
        Le Client peut le résilier à tout moment depuis son espace ; la résiliation prend effet à
        la fin du mois en cours, déjà payé. Aucun remboursement au prorata n’est effectué.
      </p>
      <p>
        L’Éditeur peut résilier l’abonnement en cas de manquement grave du Client (notamment un
        usage interdit à l’article 10), après une mise en demeure restée sans effet pendant 15
        jours, ou immédiatement en cas d’usage abusif mettant en danger le Service ou des tiers.
      </p>
      <p>
        Si l’Éditeur arrête le Service, il en informe les Clients au moins 30 jours à l’avance
        et leur permet d’exporter leurs données.
      </p>

      <h2>8. Données du Client et réversibilité</h2>
      <p>
        Le Client reste propriétaire des données qu’il importe ou saisit. Il peut les exporter
        au format CSV à tout moment, et pendant 30 jours après la fin de son abonnement. Les
        données sont ensuite supprimées dans un délai de 90 jours, sous réserve des
        obligations légales de conservation de l’Éditeur.
      </p>

      <h2>9. Disponibilité</h2>
      <p>
        L’Éditeur s’efforce de rendre le Service accessible en permanence, dans le cadre d’une
        obligation de moyens. Des interruptions peuvent survenir, notamment pour maintenance ;
        l’Éditeur prévient le Client à l’avance lorsque c’est possible. Aucun niveau de
        disponibilité chiffré n’est garanti.
      </p>

      <h2>10. Rôle d’Encair et obligations du Client</h2>
      <p>
        Encair est un logiciel. L’Éditeur n’agit pas en tant que mandataire du Client, n’exerce
        aucune activité de recouvrement de créances pour le compte d’autrui et ne perçoit aucun
        fonds pour le compte du Client ou de ses Débiteurs.
      </p>
      <p>
        Les relances sont envoyées au nom du Client et sous sa seule responsabilité. Le Client
        vérifie avant chaque envoi les soldes, les destinataires et le contenu des messages. Les
        pénalités de retard et l’indemnité forfaitaire de 40 € ne peuvent être réclamées qu’à
        des Débiteurs professionnels.
      </p>
      <p>
        Le Client garantit qu’il a le droit d’importer les données de ses Débiteurs et qu’il les
        informe de ce traitement. Il s’interdit d’utiliser le Service pour envoyer des messages
        non sollicités, répétés ou harcelants, ou pour écrire à des personnes qui ne lui doivent
        rien. En cas de manquement, l’Éditeur peut suspendre les envois.
      </p>

      <h2>11. Responsabilité de l’Éditeur</h2>
      <p>
        L’Éditeur ne garantit pas le paiement des factures suivies. Sa responsabilité est
        limitée aux dommages directs et prouvés résultant d’un manquement à ses obligations ;
        elle ne couvre pas les dommages indirects, tels qu’une perte de chiffre d’affaires ou une
        créance restée impayée. Elle est plafonnée au montant payé par le Client au titre des
        douze derniers mois.
      </p>

      <h2>12. Données personnelles</h2>
      <p>
        Les traitements dont l’Éditeur est responsable sont décrits dans la{' '}
        <a href="/privacy">politique de confidentialité</a>. Pour les données des Débiteurs,
        l’Éditeur agit comme sous-traitant du Client ; l’
        <a href="/dpa">accord de sous-traitance</a> fait partie des présentes Conditions.
      </p>

      <h2>13. Propriété intellectuelle</h2>
      <p>
        Le Service, son code, son interface et ses contenus (hors données du Client) restent la
        propriété de l’Éditeur. Le Client bénéficie d’un droit d’utilisation personnel et non
        exclusif pendant la durée de son abonnement.
      </p>

      <h2>14. Modification des Conditions</h2>
      <p>
        L’Éditeur peut modifier les présentes Conditions. Toute modification substantielle est
        notifiée par email au moins 30 jours avant son entrée en vigueur. Le Client qui la
        refuse peut résilier sans frais avant cette date.
      </p>

      <h2>15. Force majeure</h2>
      <p>
        Aucune partie n’est responsable d’un manquement causé par un événement de force majeure
        au sens de l’article 1218 du Code civil.
      </p>

      <h2>16. Droit applicable et litiges</h2>
      <p>
        Les présentes Conditions sont soumises au droit français. En cas de litige, les parties
        recherchent d’abord une solution amiable pendant 30 jours. À défaut, et lorsque les deux
        parties ont la qualité de commerçant, le litige est porté devant{' '}
        {PUBLISHER.court ?? 'le tribunal de commerce du ressort du domicile professionnel de l’Éditeur'}
        {' ; dans les autres cas, les règles de compétence de droit commun s’appliquent.'}
      </p>

      <h2>17. Contact</h2>
      <p>
        Pour toute question sur ces Conditions : <ContactLink email={CONTACT_EMAIL} />.
      </p>
    </LegalLayout>
  )
}
