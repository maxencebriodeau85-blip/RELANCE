import { LegalLayout } from '@/components/legal/legal-layout'

export const metadata = {
  title: 'Conditions Générales d\'Utilisation | RelanceFlow',
  description: 'Conditions générales d\'utilisation de RelanceFlow.',
}

export default function CGUPage() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" lastUpdated="29 avril 2026">
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent
        l&apos;accès et l&apos;utilisation du service RelanceFlow, édité par la société RelanceFlow
        SAS (ci-après « l&apos;Éditeur »).
      </p>

      <h2>1. Objet</h2>
      <p>
        RelanceFlow est une plateforme SaaS de recouvrement amiable destinée aux TPE/PME françaises.
        Elle permet d&apos;automatiser l&apos;envoi de relances de factures impayées, de générer des
        mises en demeure conformes au droit français, et de piloter le recouvrement via un tableau
        de bord.
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
        Les tarifs en vigueur sont consultables sur la page d&apos;accueil du Service. Trois
        formules sont proposées :
      </p>
      <ul>
        <li><strong>Starter</strong> : 19 € HT/mois</li>
        <li><strong>Pro</strong> : 49 € HT/mois</li>
        <li><strong>Business</strong> : 99 € HT/mois</li>
      </ul>
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
        de maintenance planifiée. Les utilisateurs Business bénéficient d&apos;un SLA garantissant
        99,9 % de disponibilité.
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
        <a href="mailto:hello@relanceflow.fr">hello@relanceflow.fr</a>.
      </p>
    </LegalLayout>
  )
}
