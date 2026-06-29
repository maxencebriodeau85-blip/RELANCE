import { ShieldCheck, MapPin, Lock, BadgeCheck } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, label: 'Paiement Stripe vérifié' },
  { icon: MapPin, label: 'Hébergement Europe (Paris)' },
  { icon: Lock, label: 'Chiffrement TLS 1.3 + RGPD' },
  { icon: BadgeCheck, label: 'Conformité L441-10 C.com.' },
]

export function TrustStrip() {
  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center mb-3">
          Ce sur quoi vous pouvez compter
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <Icon className="h-4 w-4 text-brand-600 flex-shrink-0" />
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
