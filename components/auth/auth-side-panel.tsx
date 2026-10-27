import { FileSpreadsheet, Mail, CalendarClock } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { OFFER } from '@/lib/plans'

const sideFeatures = [
  { icon: FileSpreadsheet, label: 'Import CSV', sub: 'Depuis votre logiciel de facturation actuel' },
  { icon: Mail, label: 'Relances sous contrôle', sub: 'Rien ne part sans solde confirmé' },
  { icon: CalendarClock, label: 'Promesses, paiements partiels et litiges', sub: 'La relance attend quand il le faut' },
]

/** Panneau commun aux pages de connexion et d’inscription. */
export function AuthSidePanel() {
  return (
    <aside className="hidden lg:flex lg:w-5/12 flex-col justify-between bg-[#182b40] p-10 xl:p-14 text-white">
      <Logo variant="mono-white" size="md" />
      <div className="max-w-md py-14">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[.16em] text-[#f2a17e]">Le suivi des impayés, en clair</p>
        <h2 className="text-3xl xl:text-4xl font-semibold leading-[1.15] tracking-[-.035em]">Vos impayés, suivis et relancés.</h2>
        <p className="mt-5 text-sm leading-7 text-[#c6d1dd]">
          Vous gardez votre logiciel de facturation. Encair vous montre chaque
          jour qui relancer, qui a promis de payer et quelles factures sont en litige.
        </p>
        <div className="mt-9 border-t border-white/15">
          {sideFeatures.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-4 border-b border-white/15 py-5">
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f2a17e]" />
              <div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-[#b5c3d1]">{sub}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-[#c6d1dd]">Encair est en lancement : vous faites partie des premiers utilisateurs et je lis chaque retour.</p>
        <p className="mt-2 text-xs font-semibold text-white">Maxence, fondateur</p>
      </div>
      <p className="text-xs leading-5 text-[#c6d1dd]">{OFFER.trialDays} jours gratuits · {OFFER.trialInvoiceLimit} factures · sans carte bancaire · puis {OFFER.price} € HT/mois au tarif fondateur</p>
    </aside>
  )
}
