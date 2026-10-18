import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { serviceCapabilities } from '@/lib/service-capabilities'
import { Header } from '@/components/dashboard/header'
export const dynamic = 'force-dynamic'
export default async function OperationsPage() {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser()
  if (!user) throw Error('Connectez-vous pour continuer.')
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
  const results = await Promise.all([
    db
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['failed', 'bounced', 'complained'])
      .gte('created_at', cutoff),
    db
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 15 * 60000).toISOString()),
    db
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'reminded'])
      .is('client_email', null),
    db
      .from('reminders')
      .select('id,invoice_id,status,created_at')
      .eq('user_id', user.id)
      .in('status', ['failed', 'bounced', 'complained', 'pending'])
      .order('created_at', { ascending: false })
      .limit(30),
  ])
  if (results.some((r) => r.error))
    throw Error(
      'Le suivi des relances est momentanément indisponible. Réessayez.',
    )
  const capabilities = serviceCapabilities()
  return (
    <div>
      <Header
        title="État des relances"
        description="Repérez les données manquantes et les envois à vérifier."
      />
      <div className="p-4 md:p-6 max-w-4xl space-y-5">
        <p className="rounded border bg-white p-4">
          {capabilities.automationAvailable
            ? 'La configuration de l’envoi automatique est présente. Cela ne garantit pas la réception des messages.'
            : 'L’envoi automatique n’est pas encore configuré. Vous pouvez préparer vos factures et vos modèles.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Échecs et rejets sur 30 jours', results[0].count],
            ['Envois sans confirmation depuis 15 min', results[1].count],
            ['Factures sans email client', results[2].count],
          ].map(([label, count]) => (
            <div key={String(label)} className="rounded border bg-white p-4">
              <p className="text-2xl font-semibold">{count ?? 0}</p>
              <p className="text-sm text-gray-600">{label}</p>
            </div>
          ))}
        </div>
        <p>
          Un envoi sans confirmation peut avoir été reçu : vérifiez l’historique
          et le prestataire avant toute nouvelle tentative. Un rejet nécessite
          de vérifier l’adresse du client. Une plainte impose de suspendre les
          relances concernées.
        </p>
        <h2 className="font-semibold">Derniers événements à vérifier</h2>
        <ul className="divide-y rounded border bg-white">
          {results[3].data?.map((r) => (
            <li key={r.id} className="p-3 flex flex-wrap justify-between gap-2">
              <span>
                {
                  (
                    {
                      pending: 'En attente de confirmation',
                      failed: 'Échec',
                      bounced: 'Adresse rejetée',
                      complained: 'Plainte',
                    } as Record<string, string>
                  )[r.status]
                }{' '}
                · {new Date(r.created_at).toLocaleDateString('fr-FR')}
              </span>
              <Link
                className="underline text-brand-600"
                href={`/dashboard/invoices/${r.invoice_id}`}
              >
                Ouvrir la facture
              </Link>
            </li>
          ))}
        </ul>
        {!results[3].data?.length && (
          <p>Aucun événement à vérifier dans cette liste.</p>
        )}
        <Link href="/dashboard/invoices" className="underline text-brand-600">
          Consulter et exporter mes factures
        </Link>
      </div>
    </div>
  )
}
