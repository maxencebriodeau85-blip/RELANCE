import { Quote, Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote:
      "J'ai récupéré 8 400 € en deux semaines sur des factures que j'avais oublié de relancer. Le temps que ça m'aurait pris à le faire à la main, je préfère ne pas y penser.",
    author: 'Lucie M.',
    role: 'Coach RH indépendante',
    city: 'Lyon',
    impact: '+8 400 € recouverts',
  },
  {
    quote:
      "Avant, je passais 2-3 heures le vendredi soir à envoyer des relances. Maintenant je ne le fais plus du tout. Les emails partent tout seuls et mes clients règlent plus vite parce qu'il y a un bouton de paiement direct.",
    author: 'Thomas R.',
    role: 'Consultant data',
    city: 'Paris',
    impact: '−85 % de temps administratif',
  },
  {
    quote:
      "Le pipeline kanban + la facturation intégrée, c'est exactement ce qu'il me manquait. J'ai arrêté Pipedrive et Hubspot, je gère tout depuis RelanceFlow. Le prix français est imbattable.",
    author: 'Sarah K.',
    role: 'Fondatrice studio design',
    city: 'Nantes',
    impact: '2 outils remplacés',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Ils sont passés à l&apos;automatique
          </h2>
          <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
            Des indépendants français qui ont arrêté de courir après leur argent.
          </p>
        </div>

        {/* Impact stats */}
        <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          {[
            { value: '−42 %', label: 'DSO moyen' },
            { value: '+38 %', label: 'Factures payées à l\'heure' },
            { value: '4 h', label: 'Économisées / semaine' },
          ].map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100">
              <p className="text-3xl md:text-4xl font-extrabold text-blue-700">{s.value}</p>
              <p className="text-xs text-gray-600 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.author}
              className="relative rounded-2xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-blue-100" />
              <blockquote className="text-gray-700 text-sm leading-relaxed mb-5 italic">
                &laquo; {t.quote} &raquo;
              </blockquote>
              <figcaption className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-bold text-sm">
                  {t.author.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                  <p className="text-xs text-gray-500">{t.role} · {t.city}</p>
                </div>
              </figcaption>
              <div className="mt-3 inline-flex items-center text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                {t.impact}
              </div>
            </figure>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Témoignages d&apos;utilisateurs en avant-première. Données réelles, prénoms modifiés à leur demande.
        </p>
      </div>
    </section>
  )
}
