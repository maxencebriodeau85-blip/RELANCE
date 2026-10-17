import { FileSpreadsheet, Mail, CalendarClock } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { OFFER } from '@/lib/plans'

const sideFeatures = [
  {
    icon: FileSpreadsheet,
    label: 'Import CSV',
    sub: 'Depuis votre logiciel de facturation actuel',
  },
  {
    icon: Mail,
    label: 'Relances email que vous validez',
    sub: 'Rien ne part sans solde confirmé',
  },
  {
    icon: CalendarClock,
    label: 'Promesses, paiements partiels et litiges',
    sub: 'La relance attend quand il le faut',
  },
]

/** Panneau gauche commun aux pages de connexion et d'inscription. */
export function AuthSidePanel() {
  return (
    <div className="hidden lg:flex lg:w-5/12 flex-col justify-between bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 p-10 relative overflow-hidden">
      <div className="brand-orb bg-brand-500/40 h-[300px] w-[300px] -top-20 -left-20" />
      <div className="brand-orb bg-fuchsia-500/30 h-[400px] w-[400px] bottom-0 -right-40" />
      <div className="relative">
        <Logo variant="mono-white" size="md" />
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-white leading-tight tracking-tight">
            Vos impayés, suivis et relancés.
          </h2>
          <p className="text-white/70 mt-3 text-sm leading-relaxed">
            Vous gardez votre logiciel de facturation. Encair vous montre chaque
            jour qui relancer, qui a promis de payer et quelles factures sont en litige.
          </p>
        </div>

        <div className="space-y-4">
          {sideFeatures.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-blue-300/60">{f.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-blue-100/80 leading-relaxed">
            Encair est en lancement : vous faites partie des premiers utilisateurs
            et je lis chaque retour.
          </p>
          <p className="mt-3 text-xs font-semibold text-white">Maxence, fondateur</p>
        </div>
      </div>

      <p className="text-xs text-blue-300/40">
        {OFFER.trialDays} jours gratuits · {OFFER.trialInvoiceLimit} factures · sans carte bancaire ·
        puis {OFFER.price} € HT/mois au tarif fondateur
      </p>
    </div>
  )
}
