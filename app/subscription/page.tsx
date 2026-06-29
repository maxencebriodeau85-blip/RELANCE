import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Check, AlertCircle, Clock } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { STRIPE_PLANS } from '@/lib/stripe'

const PLANS: { key: 'starter' | 'pro' | 'business'; popular: boolean; desc: string }[] = [
  { key: 'starter', popular: false, desc: 'Pour consultants et coaches indépendants' },
  { key: 'pro', popular: true, desc: 'Volume plus important et intégrations' },
  { key: 'business', popular: false, desc: 'Multi-utilisateurs et API dédiée' },
]

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, company_name')
    .eq('id', user.id)
    .single()

  // Active paid subscriber — nothing to do here
  if (profile && profile.plan !== 'free_trial') {
    redirect('/dashboard')
  }

  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isExpired = trialEnd ? trialEnd < new Date() : false
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-[#1a1656] to-brand-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="brand-orb bg-brand-500/40 h-[300px] w-[300px] -top-20 -left-20" />
      <div className="brand-orb bg-fuchsia-500/30 h-[400px] w-[400px] bottom-0 -right-40" />
      {/* Logo */}
      <div className="mb-10 relative">
        <Logo variant="mono-white" size="md" />
      </div>

      {/* Status badge */}
      {isExpired ? (
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
          <AlertCircle className="h-4 w-4" />
          Votre période d&apos;essai est terminée
        </div>
      ) : daysLeft !== null ? (
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
          <Clock className="h-4 w-4" />
          {daysLeft === 0
            ? "Dernier jour d'essai"
            : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai restant${daysLeft > 1 ? 's' : ''}`}
        </div>
      ) : null}

      {/* Title */}
      <div className="text-center mb-10 max-w-xl">
        <h1 className="text-3xl font-bold text-white mb-3">
          {isExpired ? 'Continuez avec RelanceFlow' : 'Choisissez votre plan'}
        </h1>
        <p className="text-blue-200 text-sm leading-relaxed">
          {isExpired
            ? 'Souscrivez à un plan pour retrouver immédiatement accès à votre dashboard et relancer vos créances.'
            : 'Activez votre abonnement pour profiter de toutes les fonctionnalités sans interruption.'}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mb-10">
        {PLANS.map(({ key, popular, desc }) => {
          const plan = STRIPE_PLANS[key]
          return (
            <div
              key={key}
              className={`relative rounded-2xl p-6 flex flex-col transition-transform hover:-translate-y-0.5 ${
                popular
                  ? 'bg-blue-600 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-blue-600/30'
                  : 'bg-white/8 backdrop-blur border border-white/10'
              }`}
            >
              {popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    Recommandé
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className={`text-xs mt-0.5 ${popular ? 'text-blue-200' : 'text-blue-300/70'}`}>
                  {desc}
                </p>
              </div>

              <div className="mb-5 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className={`text-sm pb-1 ${popular ? 'text-blue-200' : 'text-blue-300/70'}`}>
                  €&thinsp;/&thinsp;mois
                </span>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        popular ? 'text-cyan-300' : 'text-blue-400'
                      }`}
                    />
                    <span className={popular ? 'text-blue-50' : 'text-blue-100/80'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`/api/stripe/checkout?plan=${key}`}
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  popular
                    ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg'
                    : 'bg-blue-600/60 text-white border border-blue-500/40 hover:bg-blue-600'
                }`}
              >
                Choisir {plan.name}
              </a>
            </div>
          )
        })}
      </div>

      {/* Reassurance */}
      <p className="text-blue-300/50 text-xs text-center mb-6">
        Sans engagement · Annulation à tout moment · Données hébergées en Europe · Conforme RGPD
      </p>

      {/* Sign out */}
      <SignOutButton />
    </div>
  )
}
