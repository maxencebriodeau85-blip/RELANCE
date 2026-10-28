import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Élément absent ou supprimé dans l'espace connecté : on reste dans le
// tableau de bord au lieu d'afficher la page 404 du site public.
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <SearchX className="h-8 w-8 text-gray-600" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-bold text-gray-900">Élément introuvable</h1>
      <p className="max-w-sm text-sm text-gray-600">
        Cette facture ou ce client n’existe pas, ou a été supprimé de votre espace.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  )
}
