import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEuro } from '@/lib/metrics'
import { loadCollectionOverview } from '@/lib/collection-overview'
export default async function StatsPage() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/auth/clear-session')
  const overview = await loadCollectionOverview(db)
  const { outstanding: total, disputed, overdue, aging: buckets } = overview
  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <p className="text-sm text-brand-600 font-semibold">VOTRE SUIVI</p>
        <h1 className="text-3xl font-bold mt-2">Où en sont vos impayés ?</h1>
        <p className="text-gray-500 mt-3">
          Soldes déclarés dans Encair, après déduction des paiements renseignés.
          Les litiges restent inclus dans les sommes dues.
        </p>
      </header>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ['Reste à encaisser', total],
          ['Dont en retard', overdue],
          ['Dont en litige', disputed],
        ].map(([label, value]) => (
          <div className="bg-white border rounded-2xl p-6" key={label}>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold mt-3">
              {formatEuro(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <section className="bg-white border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-5">Ancienneté des soldes</h2>
        <div className="space-y-5">
          {buckets.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-sm mb-2">
                <span>
                  {b.label} · {b.count} facture{b.count !== 1 ? 's' : ''}
                </span>
                <strong>{formatEuro(b.amount)}</strong>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full"
                  style={{
                    width: `${total > 0 ? (b.amount / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="text-sm text-gray-500">
        Ces données ne constituent pas un relevé bancaire. Confirmez
        régulièrement les soldes ou réimportez votre export actualisé.
      </p>
      <Link className="rf-button" href="/dashboard/invoices/import">
        Actualiser avec un CSV
      </Link>
    </div>
  )
}
