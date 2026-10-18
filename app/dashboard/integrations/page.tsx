import Link from 'next/link'
import { Header } from '@/components/dashboard/header'
import { IntegrationKeys } from '@/components/dashboard/integration-keys'
export default function IntegrationsPage() {
  return (
    <div>
      <Header
        title="Connexions aux logiciels"
        description="Import CSV ou connexion avec l’API Encair."
      />
      <div className="p-4 md:p-6 max-w-3xl space-y-5">
        <p>
          Votre développeur peut connecter votre logiciel avec l’API v1 : import
          des factures, actualisation des règlements et lecture du suivi. Les
          mêmes quotas que l’import CSV s’appliquent.
        </p>
        <p>
          L’adresse email reste facultative. Une facture créée par l’API arrive
          en pause : vérifiez le destinataire et le solde avant d’activer les
          relances.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            className="text-brand-600 underline"
            href="/dashboard/invoices/import"
          >
            Importer un CSV
          </Link>
          <a className="text-brand-600 underline" href="/api-docs">
            Documentation de l’API
          </a>
        </div>
        <IntegrationKeys />
        <p className="text-sm text-gray-500">
          Aucun connecteur prêt à l’emploi Pennylane, Sage, EBP ou Cegid n’est
          fourni. L’ancien webhook est retiré. Les clés historiques ne sont pas
          compatibles avec l’API v1.
        </p>
      </div>
    </div>
  )
}
