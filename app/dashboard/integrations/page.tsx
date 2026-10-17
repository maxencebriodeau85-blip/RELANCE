import Link from 'next/link'
import { Header } from '@/components/dashboard/header'

export default function IntegrationsPage() {
  return <div>
    <Header title="Connexions aux logiciels" description="La connexion disponible aujourd’hui : l’import CSV." />
    <div className="p-6 max-w-2xl space-y-4">
      <p>Les connexions automatiques et l’API sont en préparation. Aucun connecteur Pennylane, Sage, EBP ou Cegid n’est actuellement proposé comme opérationnel.</p>
      <p>Exportez vos factures en CSV depuis votre logiciel, associez les colonnes puis vérifiez l’aperçu. Un réimport de la même référence permet d’actualiser le solde sans recréer la facture. L’email du client peut être complété ensuite.</p>
      <Link className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white" href="/dashboard/invoices/import">Importer ou actualiser mes factures</Link>
      <p className="text-sm text-gray-500">Les anciennes données de connexion sont conservées. L’ancien webhook est retiré et ne traite plus de factures.</p>
    </div>
  </div>
}
