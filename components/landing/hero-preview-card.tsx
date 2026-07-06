// Decorative dashboard preview floating in the hero — purely illustrative.
// Wrapped in <TiltCard> + given .animate-float / .glow-border by the caller
// (app/page.tsx) so this component stays a plain, server-renderable visual.
const KPIS = [
  { label: 'Encaissé', value: '12 400 €', color: 'text-emerald-700 bg-emerald-50' },
  { label: 'En cours', value: '3 240 €', color: 'text-brand-700 bg-brand-50' },
  { label: 'DSO', value: '18 j', color: 'text-gray-700 bg-gray-50' },
]

const INVOICES = [
  { name: 'Acme Corp', amount: '2 400 €', status: 'paid' as const },
  { name: 'Studio Nova', amount: '890 €', status: 'reminded' as const },
  { name: 'TechStart', amount: '1 200 €', status: 'pending' as const },
]

const STATUS_DOT: Record<string, string> = {
  paid: 'bg-green-500',
  reminded: 'bg-amber-500',
  pending: 'bg-gray-300',
}

export function HeroPreviewCard() {
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden w-full">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <div className="h-2 w-2 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-gray-400 font-mono ml-1">relanceflow.fr/dashboard</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {KPIS.map((k) => (
            <div key={k.label} className={`rounded-lg px-2 py-2 ${k.color}`}>
              <p className="text-[9px] uppercase tracking-wide opacity-70">{k.label}</p>
              <p className="text-sm font-bold">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {INVOICES.map((inv) => (
            <div key={inv.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[inv.status]}`} />
                <span className="text-xs font-medium text-gray-700">{inv.name}</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{inv.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
