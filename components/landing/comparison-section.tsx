import { Check, X, Minus } from 'lucide-react'

type Cell = boolean | 'partial' | string

interface Row {
  feature: string
  detail?: string
  rf: Cell
  pennylane: Cell
  sellsy: Cell
  manual: Cell
}

const ROWS: Row[] = [
  {
    feature: 'Pensé pour le recouvrement',
    detail: 'Pas une feature greffée sur de la compta',
    rf: true,
    pennylane: 'partial',
    sellsy: 'partial',
    manual: false,
  },
  {
    feature: 'Relances email automatiques',
    detail: 'Cordial → ferme → pré-contentieux',
    rf: true,
    pennylane: 'partial',
    sellsy: true,
    manual: false,
  },
  {
    feature: 'Mise en demeure légale',
    detail: 'Art. 1344 C.civ. + L441-10 C.com.',
    rf: true,
    pennylane: false,
    sellsy: false,
    manual: 'partial',
  },
  {
    feature: 'Lien de paiement Stripe inclus',
    detail: 'Dans chaque relance, en 1 clic',
    rf: true,
    pennylane: 'partial',
    sellsy: 'partial',
    manual: false,
  },
  {
    feature: 'Templates 100 % personnalisables',
    detail: 'Variables {{client}}, {{amount}}…',
    rf: true,
    pennylane: false,
    sellsy: 'partial',
    manual: true,
  },
  {
    feature: 'Pipeline CRM intégré',
    detail: 'Du prospect au paiement',
    rf: true,
    pennylane: false,
    sellsy: 'partial',
    manual: false,
  },
  {
    feature: 'Suivi ouverture & clic emails',
    detail: 'Tracking Resend en temps réel',
    rf: true,
    pennylane: false,
    sellsy: 'partial',
    manual: false,
  },
  {
    feature: 'Factures PDF conformes',
    detail: 'Mentions légales auto',
    rf: true,
    pennylane: true,
    sellsy: true,
    manual: 'partial',
  },
  {
    feature: 'Données hébergées en France',
    detail: 'RGPD strict',
    rf: true,
    pennylane: true,
    sellsy: true,
    manual: false,
  },
  {
    feature: 'Prix de démarrage',
    rf: '19 €/mois',
    pennylane: '29 €/mois',
    sellsy: '49 €/mois',
    manual: '3 h/sem',
  },
]

function renderCell(cell: Cell, highlight = false) {
  if (cell === true) {
    return (
      <div className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${highlight ? 'bg-brand-100' : 'bg-green-100'}`}>
        <Check className={`h-3.5 w-3.5 ${highlight ? 'text-brand-700' : 'text-green-700'}`} />
      </div>
    )
  }
  if (cell === false) {
    return (
      <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100">
        <X className="h-3.5 w-3.5 text-gray-400" />
      </div>
    )
  }
  if (cell === 'partial') {
    return (
      <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100" title="Partiel ou en supplément">
        <Minus className="h-3.5 w-3.5 text-amber-700" />
      </div>
    )
  }
  return (
    <span className={`text-xs font-bold ${highlight ? 'text-brand-700' : 'text-gray-700'}`}>{cell}</span>
  )
}

export function ComparisonSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center mb-12">
          <span className="section-eyebrow mb-4">Comparatif</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight text-balance">
            Pourquoi choisir RelanceFlow ?
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto text-pretty">
            Les outils de compta gèrent les relances « en option ». RelanceFlow est conçu pour ça.
          </p>
        </div>

        <div className="rounded-2xl ring-1 ring-gray-200/80 bg-white overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">
                    Fonctionnalité
                  </th>
                  <th className="text-center px-3 py-4 bg-brand-50 border-x border-brand-100">
                    <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">RelanceFlow</span>
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-4">
                    Pennylane
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-4">
                    Sellsy
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-4">
                    Excel / Manuel
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ROWS.map((row, i) => {
                  const isLast = i === ROWS.length - 1
                  return (
                    <tr key={row.feature} className={isLast ? 'bg-gray-50/50 font-semibold' : ''}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{row.feature}</p>
                        {row.detail && <p className="text-xs text-gray-500 mt-0.5">{row.detail}</p>}
                      </td>
                      <td className="text-center px-3 py-4 bg-brand-50/40 border-x border-brand-100/60">
                        {renderCell(row.rf, true)}
                      </td>
                      <td className="text-center px-3 py-4">{renderCell(row.pennylane)}</td>
                      <td className="text-center px-3 py-4">{renderCell(row.sellsy)}</td>
                      <td className="text-center px-3 py-4">{renderCell(row.manual)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-green-700" />
            </div>
            Inclus
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Minus className="h-2.5 w-2.5 text-amber-700" />
            </div>
            Partiel ou en option payante
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="h-2.5 w-2.5 text-gray-400" />
            </div>
            Non disponible
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4 max-w-2xl mx-auto">
          Comparatif réalisé en juin 2026 à partir des grilles tarifaires et documentations publiques.
          Pennylane, Sellsy et autres marques citées appartiennent à leurs propriétaires respectifs.
        </p>
      </div>
    </section>
  )
}
