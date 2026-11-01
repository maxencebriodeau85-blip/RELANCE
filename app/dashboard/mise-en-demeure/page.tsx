import { redirect } from 'next/navigation'

// L'ancien générateur de mise en demeure est retiré : les liens et favoris
// encore en circulation mènent à la liste des factures.
export default function FormalNoticePage() {
  redirect('/dashboard/invoices')
}
