import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/header'
import {
  collectionTasks,
  loadCollectionInvoices,
  loadCollectionReminders,
  taskLabels,
  type TaskKind,
} from '@/lib/collection-workspace'
import { formatDate, formatEuro } from '@/lib/metrics'
import { outstanding } from '@/lib/collection'
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>
}) {
  const { kind, page } = await searchParams
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/auth/clear-session')
  const now = new Date()
  const [invoices, reminders] = await Promise.all([
    loadCollectionInvoices(db, user.id),
    loadCollectionReminders(
      db,
      user.id,
      new Date(now.getTime() - 30 * 86400000).toISOString(),
    ),
  ])
  const tasks = collectionTasks(invoices, reminders, now)
  const filter = Object.hasOwn(taskLabels, kind || '')
    ? (kind as TaskKind)
    : undefined
  const filtered = filter
    ? tasks.filter((t) => t.kinds.includes(filter))
    : tasks
  const pages = Math.max(1, Math.ceil(filtered.length / 30))
  const current = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1),
  )
  const pageLink = (n: number) =>
    `/dashboard/today?${new URLSearchParams({ ...(filter ? { kind: filter } : {}), page: String(n) })}`
  return (
    <div>
      <Header
        title="À faire aujourd’hui"
        description="Une facture peut demander plusieurs vérifications. Aucun envoi n’est déclenché depuis cette liste."
      />
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <nav
          aria-label="Filtrer les actions"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {(Object.entries(taskLabels) as [TaskKind, string][]).map(
            ([key, label]) => (
              <Link
                key={key}
                href={`/dashboard/today?kind=${key}`}
                aria-current={filter === key ? 'page' : undefined}
                className={`rounded-xl border p-4 ${filter === key ? 'border-brand-600 bg-brand-50' : 'bg-white'}`}
              >
                <span className="block text-2xl font-semibold">
                  {tasks.filter((t) => t.kinds.includes(key)).length}
                </span>
                <span className="text-sm">{label}</span>
              </Link>
            ),
          )}
        </nav>
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="font-semibold">
            {filtered.length} facture(s) à vérifier
            {filter ? ` · ${taskLabels[filter]}` : ''}
          </h2>
          <Link href="/dashboard/today" className="text-sm underline">
            Toutes les actions
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Les soldes non vérifiés depuis sept jours bloquent les relances. Les
          promesses dépassées restent à confirmer avec le client. Les incidents
          d’envoi couvrent les 30 derniers jours et disparaissent de cette liste
          après une tentative plus récente sans incident.
        </p>
        {!filtered.length ? (
          <p className="rounded-xl border bg-white p-8">
            Aucune action dans cette catégorie.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            {filtered
              .slice((current - 1) * 30, current * 30)
              .map(({ invoice, kinds }) => (
                <li key={invoice.id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="break-words font-medium underline"
                      >
                        {invoice.client_name} · {invoice.invoice_number}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        Échéance {formatDate(invoice.due_date)} ·{' '}
                        {formatEuro(outstanding(invoice))}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm text-brand-700 underline"
                    >
                      Vérifier la facture →
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kinds.map((k) => (
                      <span
                        className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900"
                        key={k}
                      >
                        {taskLabels[k]}
                        {k === 'promise' && invoice.promise_date
                          ? ` · ${formatDate(invoice.promise_date)}`
                          : ''}
                      </span>
                    ))}
                  </div>
                  {kinds.includes('delivery') && (
                    <p className="mt-2 text-xs text-gray-600">
                      Consultez l’historique avant de réessayer : un envoi sans
                      confirmation peut avoir été reçu.
                    </p>
                  )}
                </li>
              ))}
          </ul>
        )}
        <nav
          aria-label="Pages des actions"
          className="flex justify-between gap-3 text-sm"
        >
          {current > 1 ? (
            <Link href={pageLink(current - 1)}>← Précédent</Link>
          ) : (
            <span />
          )}
          <span>
            Page {current} / {pages}
          </span>
          {current < pages ? (
            <Link href={pageLink(current + 1)}>Suivant →</Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </div>
  )
}
