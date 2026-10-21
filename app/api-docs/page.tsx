import Link from 'next/link'
import { LegalLayout } from '@/components/legal/legal-layout'
export default function ApiDocs() {
  return (
    <LegalLayout
      title="Connecter votre logiciel à Encair"
      lastUpdated="18 octobre 2026"
    >
      <p>
        L’API v1 permet de lire, importer et actualiser les factures en euros de
        votre compte. Elle est incluse dans l’essai et l’offre Fondateur, avec
        leurs quotas respectifs. Une intégration nécessite un développement dans
        votre logiciel ; aucun connecteur fournisseur prêt à l’emploi n’est
        inclus.
      </p>
      <p>
        <a href="/openapi.json" download>
          Télécharger la spécification OpenAPI
        </a>{' '}
        · <Link href="/dashboard/integrations">Gérer mes clés</Link>
      </p>
      <h2>1. Créer une clé</h2>
      <p>
        Dans Connexions aux logiciels, créez une clé en lecture seule ou lecture
        et écriture. Copiez-la immédiatement : elle ne sera affichée qu’une
        fois. Conservez-la sur votre serveur, jamais dans une page web, une URL
        ou un dépôt public. Elle expire au bout d’un an et se révoque depuis le
        tableau de bord.
      </p>
      <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm">
        {'Authorization: Bearer encair_VOTRE_CLE'}
      </pre>
      <h2>2. Lire les factures et leurs versions</h2>
      <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm">
        {'GET /api/v1/invoices?limit=50'}
      </pre>
      <p>
        La réponse contient invoices et next_cursor. Passez ce curseur dans le
        paramètre after jusqu’à obtenir null. Conservez updated_at pour chaque
        mise à jour. Les références externes apparaissent dans
        external_references.
      </p>
      <h2>3. Créer une facture</h2>
      <p>
        Envoyez un lot de 1 à 100 factures avec une source stable et un
        external_id unique dans cette source. Fournissez expected_updated_at:
        null pour une création. La clé d’idempotence doit être différente pour
        chaque nouvelle opération et identique lors d’un nouvel essai de la même
        opération.
      </p>
      <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm">{`POST /api/v1/invoices
Idempotency-Key: import-2026-0001
Content-Type: application/json

{
  "source": "mon-logiciel",
  "invoices": [{
    "external_id": "client-invoice-42",
    "expected_updated_at": null,
    "invoice_number": "FA-2026-0042",
    "client_name": "Atelier Exemple",
    "client_email": null,
    "amount": 1200,
    "remaining_amount": 900,
    "due_date": "2026-12-01"
  }]
}`}</pre>
      <h2>4. Actualiser un règlement</h2>
      <p>
        Reprenez la même source, le même external_id, numéro et montant initial.
        Fournissez la version updated_at actuellement enregistrée et le nouveau
        remaining_amount. Un solde nul marque la facture payée. Sans solde
        fourni, un règlement existant est conservé. Une correction qui augmente
        le reste dû remet la facture en pause.
      </p>
      <p>
        L’email est facultatif : une valeur absente ou vide conserve l’adresse
        connue. Le remplacement d’une adresse existante différente nécessite une
        modification explicite dans Encair. La synchronisation ne change pas
        silencieusement le numéro, le montant initial, l’échéance ni l’identité
        d’une facture déjà présente.
      </p>
      <h2>5. Traiter les erreurs</h2>
      <ul>
        <li>
          409 : relisez les versions et les références. Ne remplacez pas une
          version ancienne automatiquement sans vérifier les règlements.
        </li>
        <li>
          403 : contrôlez les permissions, l’accès actif et le quota de
          nouvelles factures.
        </li>
        <li>429 : attendez le délai Retry-After (60 secondes).</li>
        <li>
          503 ou coupure réseau : renvoyez le même corps avec la même clé
          d’idempotence. Les réponses réussies sont conservées au moins 30
          jours.
        </li>
      </ul>
      <p>
        Un lot est atomique : une erreur annule toutes ses écritures. Limites :
        100 factures, 256 Kio par requête et 60 requêtes par minute pour
        l’ensemble des clés du compte. Les factures créées arrivent en pause ;
        aucun email n’est envoyé par cette API.
      </p>
    </LegalLayout>
  )
}
