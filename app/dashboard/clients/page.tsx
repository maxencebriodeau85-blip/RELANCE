import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/dashboard/header'
import {
  groupCustomers,
  loadCollectionInvoices,
} from '@/lib/collection-workspace'
import { formatEuro } from '@/lib/metrics'
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page } = await searchParams
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/auth/clear-session')
  const query = q.slice(0, 200).trim().toLocaleLowerCase('fr')
  const groups = groupCustomers(
    await loadCollectionInvoices(db, user.id),
  ).filter(
    (g) =>
      !query ||
      g.invoices.some((i) =>
        `${i.client_name} ${i.client_email || ''} ${i.client_siren || ''}`
          .toLocaleLowerCase('fr')
          .includes(query),
      ),
  )
  const pages = Math.max(1, Math.ceil(groups.length / 30))
  const current = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(Number(page)) ? Number(page) : 1),
  )
  const pageLink = (n: number) =>
    `/dashboard/clients?${new URLSearchParams({ q, page: String(n) })}`
  return (
    <div>
      <Header
        title="Mes clients"
        description="Consultez les factures, les règlements enregistrés et les relances d’un même client."
      />
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <form className="flex flex-wrap gap-3">
          <label className="flex-1 text-sm">
            Rechercher un client
            <input
              name="q"
              defaultValue={q}
              maxLength={200}
              placeholder="Nom, email ou SIREN"
              className="mt-2 block w-full rounded-lg border p-3"
            />
          </label>
          <button className="rf-button rf-button-dark self-end">
            Rechercher
          </button>
        </form>
        <p className="text-sm text-gray-500">
          Regroupement par SIREN ou, à défaut, par nom et email identiques. Sans
          ces informations, les factures restent séparées. Ce regroupement ne
          modifie pas les factures ni leur calendrier de relance.
        </p>
        <p className="text-sm">{groups.length} fiche(s) client</p>
        {!groups.length && (
          <p className="rounded-xl border bg-white p-6">
            Aucun client trouvé. Les clients apparaissent à partir de vos
            factures.
          </p>
        )}
        <ul className="divide-y rounded-xl border bg-white">
          {groups.slice((current - 1) * 30, current * 30).map((g) => (
            <li key={g.id}>
              <Link
                href={`/dashboard/clients/${g.id}`}
                className="flex flex-wrap justify-between gap-4 p-5 hover:bg-brand-50"
              >
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{g.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {g.invoices.length} facture(s)
                    {g.uncertain ? ' · Identité à compléter' : ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{formatEuro(g.remaining)}</p>
                  <p className="text-xs text-gray-500">reste à encaisser →</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <nav
          aria-label="Pages des clients"
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
