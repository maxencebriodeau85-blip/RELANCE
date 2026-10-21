import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/header'
import {
  customerKey,
  groupCustomers,
  loadCollectionInvoices,
  loadCollectionReminders,
} from '@/lib/collection-workspace'
import { outstanding } from '@/lib/collection'
import { formatDate, formatEuro } from '@/lib/metrics'
const statuses: Record<string, string> = {
  pending: 'En attente de confirmation',
  sent: 'Envoyée',
  delivered: 'Délivrée',
  opened: 'Ouverte',
  clicked: 'Lien consulté',
  failed: 'Échec',
  bounced: 'Adresse rejetée',
  complained: 'Plainte',
}
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page } = await searchParams
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/auth/clear-session')
  const invoices = await loadCollectionInvoices(db, user.id)
  const anchor = invoices.find((i) => i.id === id)
  if (!anchor) notFound()
  const key = customerKey(anchor)
  const group = groupCustomers(
    invoices.filter((i) => customerKey(i) === key),
  )[0]
  const reminders = await loadCollectionReminders(
    db,
    user.id,
    undefined,
    group.invoices.map((i) => i.id),
  )
  const refs = new Map(group.invoices.map((i) => [i.id, i.invoice_number]))
  const emails = [
    ...new Set(group.invoices.map((i) => i.client_email).filter(Boolean)),
  ]
  const recent = reminders.filter(
    (r) =>
      ['pending', 'sent', 'delivered', 'opened', 'clicked'].includes(
        r.status,
      ) && Date.parse(r.created_at) > Date.now() - 7 * 86400000,
  )
  const pages = Math.max(1, Math.ceil(reminders.length / 30))
  const current = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1),
  )
  return (
    <div>
      <Header
        title={group.name}
        description="Factures et historique de suivi du client."
      />
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <Link href="/dashboard/clients" className="text-sm underline">
          ← Mes clients
        </Link>
        <p className="break-words text-sm text-gray-600">
          {anchor.client_siren ? `SIREN : ${anchor.client_siren} · ` : ''}
          {emails.join(' · ') || 'Email à compléter sur les factures'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Factures', String(group.invoices.length)],
            ['Reste à encaisser', formatEuro(group.remaining)],
            ['Règlements enregistrés', formatEuro(group.paid)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        {group.uncertain && (
          <p className="rounded-lg bg-amber-50 p-4 text-sm">
            Identité incomplète : cette facture reste séparée des autres
            clients. Complétez son SIREN ou son nom et son email dans la fiche
            facture.
          </p>
        )}
        {recent.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            {recent.length} tentative(s) de relance dans les sept derniers
            jours. Consultez l’historique avant de relancer une autre facture de
            ce client. Vous pouvez suspendre les relances depuis chaque fiche
            facture.
          </p>
        )}
        <section>
          <h2 className="mb-3 font-semibold">Factures et notes de suivi</h2>
          <ul className="divide-y rounded-xl border bg-white">
            {group.invoices
              .slice()
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .map((i) => (
                <li key={i.id} className="p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <Link
                      className="font-medium underline"
                      href={`/dashboard/invoices/${i.id}`}
                    >
                      {i.invoice_number}
                    </Link>
                    <span>{formatEuro(outstanding(i))} restant</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Échéance {formatDate(i.due_date)} ·{' '}
                    {i.status === 'paid'
                      ? 'Réglée'
                      : i.status === 'disputed'
                        ? 'Litige'
                        : i.reminders_paused !== false
                          ? 'Relances en pause'
                          : 'Suivi actif'}{' '}
                    · Règlements :{' '}
                    {formatEuro(Number(i.amount) - outstanding(i))}
                    {i.promise_date
                      ? ` · Promesse : ${formatDate(i.promise_date)}`
                      : ''}
                  </p>
                  {i.notes && (
                    <p className="mt-3 whitespace-pre-wrap break-words rounded bg-gray-50 p-3 text-sm">
                      {i.notes}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">
            Historique des relances ({reminders.length})
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            Les réponses reçues dans votre messagerie ne sont pas synchronisées.
            Consignez-les dans les notes de la facture.
          </p>
          {!reminders.length ? (
            <p>Aucune relance enregistrée.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-white">
              {reminders.slice((current - 1) * 30, current * 30).map((r) => (
                <li key={r.id} className="p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="underline"
                      href={`/dashboard/invoices/${r.invoice_id}`}
                    >
                      {refs.get(r.invoice_id)}
                    </Link>
                    <span>
                      {formatDate(r.created_at)} ·{' '}
                      {statuses[r.status] || r.status}
                    </span>
                  </div>
                  <p className="mt-2 break-words">{r.subject || 'Relance'}</p>
                </li>
              ))}
            </ul>
          )}
          <nav
            aria-label="Pages de l’historique"
            className="mt-4 flex justify-between text-sm"
          >
            {current > 1 ? (
              <Link href={`?page=${current - 1}`}>← Précédent</Link>
            ) : (
              <span />
            )}
            <span>
              Page {current} / {pages}
            </span>
            {current < pages ? (
              <Link href={`?page=${current + 1}`}>Suivant →</Link>
            ) : (
              <span />
            )}
          </nav>
        </section>
      </div>
    </div>
  )
}
