interface LineChartProps {
  data: { label: string; value: number }[]
  height?: number
  color?: string
  fillColor?: string
  unit?: string
  precision?: number
}

export function LineChart({
  data,
  height = 140,
  color = '#2563EB',
  fillColor = '#DBEAFE',
  unit = '',
  precision = 0,
}: LineChartProps) {
  if (data.length === 0) return null

  const width = 600
  const padding = { top: 20, right: 16, bottom: 28, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const values = data.map((d) => d.value)
  const maxV = Math.max(...values, 1)
  const minV = Math.min(...values, 0)
  const range = Math.max(maxV - minV, 1)

  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW
  const points = data.map((d, i) => {
    const x = padding.left + i * xStep
    const y = padding.top + innerH - ((d.value - minV) / range) * innerH
    return { x, y, label: d.label, value: d.value }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`

  // Y-axis ticks (3 lines)
  const ticks = [0, 0.5, 1].map((t) => ({
    y: padding.top + innerH - t * innerH,
    value: minV + t * range,
  }))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={t.y}
            x2={width - padding.right}
            y2={t.y}
            stroke="#E5E7EB"
            strokeDasharray="2 3"
            strokeWidth="1"
          />
          <text
            x={padding.left - 6}
            y={t.y + 3}
            textAnchor="end"
            fontSize="9"
            fill="#9CA3AF"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {t.value.toFixed(precision)}{unit}
          </text>
        </g>
      ))}

      {/* Fill area */}
      <path d={fillPath} fill={fillColor} opacity="0.5" />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
          <text
            x={p.x}
            y={padding.top + innerH + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#6B7280"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
