import Link from 'next/link'
import { Header } from '@/components/dashboard/header'

export default function FormalNoticePage() {
  return <div>
    <Header title="Mise en demeure" description="Le générateur historique n’est plus disponible." />
    <div className="p-6 max-w-2xl space-y-4">
      <p>Encair se concentre sur le suivi des soldes et les relances amiables. La génération de courriers juridiques nécessite une validation distincte et ne fait pas partie de l’offre actuelle.</p>
      <p>Vos factures et historiques restent conservés. Vous pouvez télécharger leur fiche de suivi depuis chaque facture.</p>
      <Link className="text-brand-700 underline" href="/dashboard/invoices">Revenir à mes factures</Link>
    </div>
  </div>
}
