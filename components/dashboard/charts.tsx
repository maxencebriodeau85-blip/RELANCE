'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface MonthlyData {
  month: string
  collected: number
  overdue: number
}

interface AgingData {
  label: string
  amount: number
  count: number
}

function euroTick(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`
  return `${value}€`
}

const CustomTooltipCollections = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'collected' ? 'Récupéré' : 'Nouveau retard'} :{' '}
          <span className="font-bold">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(p.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

const CustomTooltipAging = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-red-600">
        Montant :{' '}
        <span className="font-bold">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(payload[0].value)}
        </span>
      </p>
      <p className="text-gray-500">{payload[0].payload.count} facture{payload[0].payload.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

const AGING_COLORS = ['#6B7280', '#F59E0B', '#F97316', '#EF4444', '#991B1B']

export function CollectionsChart({ data }: { data: MonthlyData[] }) {
  if (!data.length) return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-400">
      Aucune donnée disponible
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={euroTick} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltipCollections />} />
        <Area
          type="monotone"
          dataKey="collected"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#gradCollected)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AgingBarChart({ data }: { data: AgingData[] }) {
  if (!data.length) return (
    <div className="h-48 flex items-center justify-center text-sm text-gray-400">
      Aucune donnée disponible
    </div>
  )
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={euroTick} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltipAging />} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={AGING_COLORS[idx % AGING_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
