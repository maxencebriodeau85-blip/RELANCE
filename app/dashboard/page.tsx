import { GettingStarted } from '@/components/dashboard/getting-started'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Upload,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
} from 'lucide-react'
import { formatEuro, formatDate } from '@/lib/metrics'
import { outstanding, reminderBlock } from '@/lib/collection'
import { loadCollectionOverview } from '@/lib/collection-overview'

export default async function DashboardPage() {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/auth/clear-session')
  const { data: profile, error: profileError } = await db.from('profiles').select('company_name, plan, trial_ends_at').eq('id', user.id).single()
  if (profileError || !profile) throw new Error('Votre profil ne peut pas être chargé.')
  const overview = await loadCollectionOverview(db)
  const priorities = overview.priorities
  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[.16em] text-brand-600">
            Votre espace de suivi
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-900">
            Gardez le fil de vos paiements.
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Vos soldes, vos promesses et vos prochaines actions, au même
            endroit.
          </p>
        </div>
        <Link
          href="/dashboard/invoices/import"
          className="rf-button rf-button-dark"
        >
          <Upload size={17} />
          Importer / actualiser
        </Link>
      </div>
      <GettingStarted companyReady={Boolean(profile.company_name)} imported={overview.invoice_count > 0} verified={overview.has_verified} trialEndsAt={profile.plan === 'free_trial' ? profile.trial_ends_at : null} />
      <Link href="/dashboard/today" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-5"><span><b>À faire aujourd’hui</b><span className="mt-1 block text-sm text-gray-600">Emails à compléter, soldes à vérifier, promesses dépassées et incidents d’envoi.</span></span><span className="text-sm font-medium">Voir mes actions →</span></Link>
      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Reste à encaisser',
            value: overview.outstanding,
            note: `${overview.active_count} factures ouvertes`,
            style: 'bg-brand-900 text-white',
          },
          {
            label: 'Échéances dépassées',
            value: overview.overdue,
            note: `${overview.overdue_count} factures, litiges inclus`,
            style: 'bg-white text-brand-900',
          },
          {
            label: 'Paiements promis',
            value: overview.promised,
            note: `${overview.promise_count} promesses en cours`,
            style: 'bg-white text-brand-900',
          },
          {
            label: 'Montants en litige',
            value: overview.disputed,
            note: 'Relances suspendues',
            style: 'bg-white text-brand-900',
          },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border border-brand-100 p-5 ${k.style}`}
          >
            <p className="text-xs opacity-70">{k.label}</p>
            <p className="my-4 text-3xl font-medium tracking-tight tabular-nums">
              {formatEuro(k.value)}
            </p>
            <p className="text-xs opacity-65">{k.note}</p>
          </div>
        ))}
      </div>
      {overview.stale_count > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <p className="text-sm leading-relaxed text-amber-900">
            <b>
              {overview.stale_count} solde{overview.stale_count > 1 ? 's' : ''} à vérifier.
            </b>{' '}
            Actualisez votre export ou confirmez les paiements sur la fiche de
            chaque facture. Les soldes non vérifiés depuis sept jours suspendent
            les relances.
          </p>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-5">
            <h2 className="text-base font-semibold">Votre liste de suivi</h2>
            <Link href="/dashboard/invoices" className="text-xs text-brand-700">
              Toutes les factures →
            </Link>
          </div>
          {!priorities.length ? (
            <div className="px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto mb-5 text-brand-400" size={35} />
              <h3 className="text-lg font-medium">
                {overview.invoice_count
                  ? 'Tout est réglé.'
                  : 'Votre suivi commence ici.'}
              </h3>
              <p className="mx-auto mb-6 mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                Importez un export de votre logiciel de facturation. Les
                nouvelles factures restent en pause jusqu’à votre validation.
              </p>
              <Link
                href="/dashboard/invoices/import"
                className="rf-button rf-button-dark"
              >
                Importer mon premier fichier <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {priorities.map((i) => {
                const reason = reminderBlock(i)
                return (
                  <Link
                    href={`/dashboard/invoices/${i.id}`}
                    key={i.id}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-brand-50"
                  >
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600 sm:flex">
                      {i.client_name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {i.client_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {i.invoice_number} · Éch. {formatDate(i.due_date)}
                      </p>
                      <p className="mt-2 text-xs text-brand-700">
                        {i.status === 'disputed'
                          ? 'Litige à traiter'
                          : i.promise_date
                            ? `Promesse : ${formatDate(i.promise_date)}`
                            : reason || 'Relance disponible'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatEuro(outstanding(i))}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        reste à payer
                      </p>
                    </div>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-brand-400"
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <div className="rounded-xl border bg-[#eef2e5] p-5">
            <Clock3 size={21} className="mb-5 text-brand-600" />
            <h2 className="font-medium">Un point régulier suffit.</h2>
            <p className="mb-5 mt-3 text-sm leading-relaxed text-gray-500">
              Mettez à jour vos soldes, notez les réponses et laissez les
              scénarios suivre les factures validées.
            </p>
            <Link
              href="/dashboard/scenarios"
              className="text-sm font-medium text-brand-800"
            >
              Configurer mes relances →
            </Link>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-sm font-semibold">Votre routine</h2>
            <ol className="mt-4 space-y-4 text-xs leading-relaxed text-gray-500">
              <li>01 · Actualiser les règlements reçus</li>
              <li>02 · Vérifier les promesses arrivées à échéance</li>
              <li>03 · Traiter les litiges et réactiver les suivis</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
