import { LegalLayout } from '@/components/legal/legal-layout'

export const metadata = {
  title: 'Conditions Générales d\'Utilisation | Encair',
  description: 'Conditions générales d\'utilisation de Encair.',
}

export default function CGUPage() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" lastUpdated="13 octobre 2026">
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent
        l&apos;accès et l&apos;utilisation du service Encair, dont les coordonnées de l’éditeur figurent dans les mentions légales (ci-après « l&apos;Éditeur »).
      </p>

      <h2>1. Objet</h2>
      <p>
        Encair est un logiciel de suivi des factures impayées pour les professionnels.
        Le service permet d’importer des factures existantes, d’actualiser leurs soldes,
        de suivre les promesses de paiement et les litiges, et de préparer des relances email.
        L’utilisateur confirme les soldes et active les envois. Le service ne garantit pas le règlement des factures.

      </p>

      <h2>2. Acceptation des CGU</h2>
      <p>
        L&apos;utilisation du Service implique l&apos;acceptation pleine et entière des présentes
        CGU. L&apos;utilisateur reconnaît en avoir pris connaissance et les accepter sans réserve
        lors de la création de son compte.
      </p>

      <h2>3. Inscription et compte utilisateur</h2>
      <p>
        L&apos;inscription au Service est réservée aux personnes morales et physiques exerçant une
        activité professionnelle. L&apos;utilisateur s&apos;engage à fournir des informations
        exactes lors de son inscription et à les maintenir à jour.
      </p>
      <p>
        Chaque utilisateur dispose d&apos;un compte personnel protégé par un mot de passe.
        L&apos;utilisateur est seul responsable de la confidentialité de ses identifiants et de
        toutes les actions effectuées depuis son compte.
      </p>

      <h2>4. Essai gratuit</h2>
      <p>
        Tout nouvel utilisateur bénéficie d&apos;une période d&apos;essai gratuit de 30 jours, sans
        engagement et sans carte bancaire. À l&apos;issue de cette période, l&apos;utilisateur peut
        souscrire à l&apos;une des formules payantes ou cesser d&apos;utiliser le Service.
      </p>

      <h2>5. Tarifs et facturation</h2>
      <p>
        L’offre fondateur est proposée à 16 € HT par mois pour un utilisateur et
        100 nouvelles factures par mois. L’actualisation des factures existantes ne consomme
        pas ce quota. L’essai gratuit est limité à 10 factures. Le tarif public prévu est de 29 € HT/mois.
      </p>
      <p>Le tarif fondateur reste applicable tant que l’abonnement souscrit reste actif.
      Les abonnements antérieurs conservent leur tarif jusqu’à une modification explicitement demandée.</p>
      <p>
        Le paiement s&apos;effectue mensuellement par carte bancaire via notre prestataire Stripe.
        Une facture est générée automatiquement à chaque échéance et adressée par email.
      </p>

      <h2>6. Résiliation</h2>
      <p>
        L&apos;utilisateur peut résilier son abonnement à tout moment depuis son espace personnel.
        La résiliation prend effet à la fin de la période en cours. Aucun remboursement
        n&apos;est effectué pour les périodes entamées.
      </p>

      <h2>7. Disponibilité du Service</h2>
      <p>
        L&apos;Éditeur s&apos;engage à fournir un Service accessible 24h/24 et 7j/7, hors périodes
        de maintenance planifiée. Aucun niveau chiffré de disponibilité n’est garanti dans l’offre fondateur.
      </p>

      <h2>8. Responsabilités</h2>
      <p>
        L&apos;utilisateur est seul responsable des données qu&apos;il importe et des relances
        qu&apos;il envoie via le Service. L&apos;Éditeur ne saurait être tenu responsable du
        contenu des relances ni des éventuels litiges entre l&apos;utilisateur et ses clients.
      </p>
      <p>
        L&apos;Éditeur s&apos;engage à mettre en œuvre tous les moyens raisonnables pour assurer le
        bon fonctionnement du Service, sans toutefois garantir une absence totale d&apos;erreurs ou
        d&apos;interruptions.
      </p>

      <h2>9. Propriété intellectuelle</h2>
      <p>
        Le Service, sa structure, ses fonctionnalités et son contenu (hors données utilisateurs)
        sont la propriété exclusive de l&apos;Éditeur et sont protégés par le droit de la propriété
        intellectuelle. Toute reproduction ou utilisation non autorisée est strictement interdite.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est régi par notre{' '}
        <a href="/privacy">Politique de confidentialité</a>, conformément au Règlement Général sur
        la Protection des Données (RGPD).
      </p>

      <h2>11. Modification des CGU</h2>
      <p>
        L&apos;Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les
        utilisateurs seront informés par email de toute modification substantielle au moins 30
        jours avant son entrée en vigueur.
      </p>

      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige relatif à leur
        interprétation ou à leur exécution relèvera de la compétence exclusive des tribunaux de
        Paris.
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU, vous pouvez nous contacter à{' '}
        <a href="/contact">notre formulaire de contact</a>.
      </p>
    </LegalLayout>
  )
}
