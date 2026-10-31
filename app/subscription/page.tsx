import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Clock, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CheckoutButton } from '@/components/auth/checkout-button'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { OFFER, PRICE_TAX, priceLabel, trialCarryoverEnd } from '@/lib/plans'

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams
  const supabase = await createClient()
  const {
    data: { user }, error: authError,
  } = await supabase.auth.getUser()

  // See app/auth/clear-session/route.ts — an invalid session must be cleared
  // via a Route Handler, not a redirect straight out of this Server Component.
  if (authError && (!authError.status || authError.status >= 500)) throw new Error('La connexion est momentanément indisponible. Réessayez.')
  if (!user) redirect('/auth/clear-session')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, company_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) throw new Error('Votre profil ne peut pas être chargé. Réessayez dans un instant.')

  // Abonné actif : rien à faire ici.
  if (profile.plan !== 'free_trial') redirect('/dashboard')

  const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isExpired = !trialEnd || !Number.isFinite(trialEnd.getTime()) || trialEnd <= new Date()
  const daysLeft = trialEnd && !isExpired ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000)) : null
  // Même règle que /api/stripe/checkout : les jours d’essai restants sont conservés.
  const firstCharge = trialCarryoverEnd(profile)
  const firstChargeLabel = firstCharge
    ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(new Date(firstCharge * 1000))
    : null

  return (
    <main id="main-content" tabIndex={-1} className="rf-site flex min-h-screen flex-col items-center px-5 py-10 outline-none sm:py-14">
      <Logo size="md" className="mb-10" />

      <div className="w-full max-w-xl">
        {isExpired ? (
          <p className="mb-5 inline-flex items-center gap-2 rounded-md bg-[#fdf1ef] px-3 py-1.5 text-sm font-medium text-[#8f1d13]">
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> Votre essai est terminé
          </p>
        ) : daysLeft !== null ? (
          <p className="mb-5 inline-flex items-center gap-2 rounded-md bg-[#f8e4d6] px-3 py-1.5 text-sm font-medium text-[#8c3f20]">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {daysLeft === 0 ? 'Dernier jour d’essai' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} d’essai restant${daysLeft > 1 ? 's' : ''}`}
          </p>
        ) : null}

        <h1 className="text-3xl font-semibold tracking-tight text-[#182b40] sm:text-4xl">
          {isExpired ? 'Reprenez vos relances là où vous les avez laissées.' : 'Gardez votre suivi sans interruption.'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#4e5b68]">
          {isExpired
            ? 'Vos factures, promesses et historiques sont conservés. L’abonnement relance l’ajout de factures et les envois.'
            : 'Activez l’offre fondateur maintenant : vos relances continuent sans coupure à la fin de l’essai.'}
        </p>

        {checkout === 'cancelled' && (
          <p role="status" className="mt-6 rounded-lg border border-[#e3ddd2] bg-white p-4 text-sm text-[#2f3f50]">
            Vous avez quitté le paiement : rien n’a été prélevé.{!isExpired && ' Votre essai continue.'}
          </p>
        )}

        <section aria-labelledby="offre" className="mt-8 rounded-[10px] border border-[#dacaba] bg-white p-6 shadow-[6px_6px_0_#e9e2d5] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="offre" className="text-lg font-semibold text-[#182b40]">Offre {OFFER.name}</h2>
            <span className="rounded-md bg-[#f8e4d6] px-2.5 py-1 text-xs font-semibold text-[#8c3f20]">Tarif de lancement</span>
          </div>
          <p className="mt-4 flex items-baseline gap-2 text-[#182b40]">
            <span className="text-5xl font-semibold tracking-tight">{OFFER.price} €</span>
            <span className="text-sm text-[#5b6570]">{PRICE_TAX ? 'HT / mois' : '/ mois'}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#5b6570]">
            Tarif public prévu : {priceLabel(OFFER.publicPrice)}. Vos {priceLabel(OFFER.price)} sont conservés tant que votre
            abonnement reste actif.
          </p>
          <ul className="mt-6 grid gap-3 border-t border-[#e7e4dc] pt-6">
            {OFFER.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-[#2f3f50]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b9522d]" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <CheckoutButton />
          </div>
          {firstChargeLabel && (
            <p className="mt-4 rounded-md bg-[#f6f3ec] p-3 text-center text-sm leading-relaxed text-[#2f3f50]">
              Aucun prélèvement avant le <strong>{firstChargeLabel}</strong> : vos jours d’essai restants sont conservés.
              Annulation sans frais jusqu’à cette date.
            </p>
          )}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#5b6570]">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Paiement sécurisé par Stripe · Sans engagement · Résiliation en ligne
          </p>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          {isExpired ? (
            <Link href="/dashboard" className="rf-arrow-link">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Consulter et exporter mes factures
            </Link>
          ) : (
            <Link href="/dashboard" className="rf-arrow-link">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Continuer mon essai gratuit
            </Link>
          )}
          <SignOutButton />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-[#5b6570]">
          Une question avant de vous abonner ? <Link href="/contact" className="underline underline-offset-2">Écrivez-nous</Link> :
          réponse personnelle sous 48 h ouvrées. Conditions : <Link href="/cgu" className="underline underline-offset-2">CGU/CGV</Link>.
        </p>
      </div>
    </main>
  )
}
