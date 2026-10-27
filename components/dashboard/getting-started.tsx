import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { SampleInvoicesButton } from './sample-invoices'
export function GettingStarted({ companyReady, imported, verified, trialEndsAt, canTrySamples = false }: { companyReady: boolean; imported: boolean; verified: boolean; trialEndsAt: string | null; canTrySamples?: boolean }) {
  const tasks = [
    { label: 'Vérifier mes coordonnées', detail: 'Le nom qui apparaîtra dans vos relances.', href: '/dashboard/settings', done: companyReady },
    { label: 'Importer mes factures', detail: 'Votre export CSV, sans modifier votre facturation.', href: '/dashboard/invoices/import', done: imported },
    { label: 'Valider un premier suivi', detail: 'Vérifiez le solde puis levez la pause sur la facture.', href: '/dashboard/invoices', done: verified },
  ]
  if (tasks.every(task => task.done)) return null
  const days = trialEndsAt ? Math.max(0, Math.ceil((Date.parse(trialEndsAt) - Date.now()) / 86400000)) : null
  return <section className="mb-7 rounded-xl border border-brand-200 bg-white p-5 sm:p-6" aria-labelledby="getting-started-title">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="getting-started-title" className="font-semibold">Vos premiers pas · {tasks.filter(task => task.done).length}/3</h2>
      {days !== null && Number.isFinite(days) && <Link href="/subscription" className="text-xs text-brand-700">Essai : {days} jours restants · 10 factures</Link>}
    </div>
    <div className="grid gap-4 md:grid-cols-3">{tasks.map(task => <Link href={task.href} key={task.label} className="rounded-lg border p-4 hover:bg-brand-50">
      {task.done ? <CheckCircle2 className="mb-3 h-5 w-5 text-green-700" aria-label="Terminé" /> : <Circle className="mb-3 h-5 w-5 text-brand-300" aria-label="À faire" />}
      <p className="text-sm font-medium">{task.label}</p><p className="mt-2 text-xs leading-relaxed text-gray-500">{task.detail}</p>
    </Link>)}</div>
    {canTrySamples && <SampleInvoicesButton />}
  </section>
}
