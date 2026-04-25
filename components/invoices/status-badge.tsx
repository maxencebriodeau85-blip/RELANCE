import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/lib/database.types'

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: 'pending' | 'reminded' | 'formal_notice' | 'paid' | 'disputed' }
> = {
  pending: { label: 'En attente', variant: 'pending' },
  reminded: { label: 'Relancé', variant: 'reminded' },
  formal_notice: { label: 'Mise en demeure', variant: 'formal_notice' },
  paid: { label: 'Payé', variant: 'paid' },
  disputed: { label: 'Litigieux', variant: 'disputed' },
}

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'pending' as const }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
