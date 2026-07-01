import { LegalLayout } from '@/components/legal/legal-layout'

export const metadata = {
  title: 'Politique de confidentialité | RelanceFlow',
  description: 'Politique de confidentialité et protection des données de RelanceFlow.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="29 avril 2026">
      <p>
        RelanceFlow attache une importance primordiale à la protection de vos données personnelles.
        Cette politique vous explique quelles données nous collectons, pourquoi, et comment nous les
        utilisons, conformément au Règlement Général sur la Protection des Données (RGPD —
        Règlement UE 2016/679).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est la société <strong>RelanceFlow SAS</strong>,
        joignable à <a href="mailto:hello@relanceflow.fr">hello@relanceflow.fr</a>.
      </p>

      <h2>2. Données collectées</h2>
      <h3>Données de compte</h3>
      <ul>
        <li>Adresse email professionnelle</li>
        <li>Nom de l&apos;entreprise</li>
        <li>Mot de passe (hashé, jamais stocké en clair)</li>
      </ul>

      <h3>Données de facturation</h3>
      <ul>
        <li>Informations de paiement (gérées exclusivement par Stripe, non stockées chez nous)</li>
        <li>Historique des facturations</li>
      </ul>

      <h3>Données métier</h3>
      <ul>
        <li>Factures importées (numéro, montant, date, client, statut)</li>
        <li>Coordonnées de vos clients (nom, email) utilisées pour les relances</li>
        <li>Scénarios de relance configurés</li>
      </ul>

      <h3>Données d&apos;usage</h3>
      <ul>
        <li>Logs de connexion et d&apos;actions (sécurité)</li>
        <li>Données de navigation anonymisées</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <ul>
        <li>Fournir le service RelanceFlow (base légale : exécution du contrat)</li>
        <li>Envoyer les relances pour votre compte (base légale : exécution du contrat)</li>
        <li>Gérer la facturation et les abonnements (base légale : obligation légale)</li>
        <li>Améliorer le service via des analyses agrégées (base légale : intérêt légitime)</li>
        <li>Vous envoyer des communications importantes sur le service (base légale : intérêt légitime)</li>
      </ul>

      <h2>4. Durée de conservation</h2>
      <ul>
        <li>Données de compte : durée de l&apos;abonnement + 3 ans</li>
        <li>Données de facturation : 10 ans (obligation légale comptable)</li>
        <li>Logs de sécurité : 12 mois</li>
        <li>Données métier : durée de l&apos;abonnement + 90 jours après résiliation</li>
      </ul>

      <h2>5. Partage des données</h2>
      <p>Nous ne vendons jamais vos données. Nous faisons appel aux sous-traitants suivants :</p>
      <ul>
        <li><strong>Supabase</strong> — hébergement base de données (UE)</li>
        <li><strong>Vercel</strong> — hébergement application (UE)</li>
        <li><strong>Vercel Analytics &amp; Speed Insights</strong> — mesure d&apos;audience sans cookies (aucune donnée personnelle collectée, uniquement des vues de page anonymisées et des indicateurs de performance)</li>
        <li><strong>Stripe</strong> — traitement des paiements</li>
        <li><strong>Resend</strong> — envoi des emails transactionnels</li>
      </ul>
      <p>
        Chacun de ces prestataires est soumis à des garanties contractuelles conformes au RGPD.
      </p>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
        <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
        <li><strong>Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à{' '}
        <a href="mailto:privacy@relanceflow.fr">privacy@relanceflow.fr</a>. Nous répondons sous 30
        jours. Vous pouvez également introduire une réclamation auprès de la{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Vos données sont transmises via HTTPS (TLS 1.3), stockées avec chiffrement au repos, et
        accessibles uniquement via des politiques de sécurité strictes (Row Level Security
        Supabase). Des audits de sécurité sont effectués régulièrement.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service
        (session d&apos;authentification). Aucun cookie publicitaire ou de tracking tiers
        n&apos;est utilisé.
      </p>

      <h2>9. Contact DPO</h2>
      <p>
        Pour toute question relative à la protection de vos données :{' '}
        <a href="mailto:privacy@relanceflow.fr">privacy@relanceflow.fr</a>
      </p>
    </LegalLayout>
  )
}
