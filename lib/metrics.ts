import type { Invoice } from './database.types'

export interface AgingBucket {
  label: string
  count: number
  amount: number
  days: { min: number; max: number | null }
}

export interface DashboardMetrics {
  totalReceivables: number
  totalOverdue: number
  dso: number
  recoveryRate: number
  invoiceCount: number
  overdueCount: number
  paidThisMonth: number
  agingBuckets: AgingBucket[]
  statusBreakdown: {
    pending: number
    reminded: number
    formal_notice: number
    paid: number
    disputed: number
  }
}

export function calculateDSO(invoices: Invoice[]): number {
  if (invoices.length === 0) return 0

  // DSO = (Encours clients / CA TTC) × Nombre de jours de la période
  // Simplified: average days to collect (or if unpaid, days outstanding)
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid')
  const today = new Date()

  if (paidInvoices.length === 0) {
    // If no paid invoices, calculate average days overdue for unpaid ones
    const overdueInvoices = invoices.filter((inv) => {
      const dueDate = new Date(inv.due_date)
      return dueDate < today && inv.status !== 'paid'
    })
    if (overdueInvoices.length === 0) return 0

    const totalDays = overdueInvoices.reduce((sum, inv) => {
      const dueDate = new Date(inv.due_date)
      const days = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      return sum + days
    }, 0)
    return Math.round(totalDays / overdueInvoices.length)
  }

  // For paid invoices: measure from issued_date to updated_at (proxy for payment date)
  const totalDays = paidInvoices.reduce((sum, inv) => {
    const issuedDate = new Date(inv.issued_date)
    const paidDate = new Date(inv.updated_at)
    const days = Math.max(0, Math.floor((paidDate.getTime() - issuedDate.getTime()) / (1000 * 60 * 60 * 24)))
    return sum + days
  }, 0)

  return Math.round(totalDays / paidInvoices.length)
}

export function calculateRecoveryRate(invoices: Invoice[]): number {
  if (invoices.length === 0) return 0

  const overdueInvoices = invoices.filter((inv) => {
    const dueDate = new Date(inv.due_date)
    return dueDate < new Date()
  })

  if (overdueInvoices.length === 0) return 100

  const paidFromOverdue = overdueInvoices.filter((inv) => inv.status === 'paid').length
  return Math.round((paidFromOverdue / overdueInvoices.length) * 100)
}

export function getDaysOverdue(invoice: Invoice): number {
  const today = new Date()
  const dueDate = new Date(invoice.due_date)
  if (dueDate >= today) return 0
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

export function calculateAgingBuckets(invoices: Invoice[]): AgingBucket[] {
  const activeInvoices = invoices.filter((inv) => inv.status !== 'paid')
  const today = new Date()

  const buckets: AgingBucket[] = [
    { label: 'À échoir', count: 0, amount: 0, days: { min: -Infinity, max: 0 } },
    { label: '1–30 jours', count: 0, amount: 0, days: { min: 1, max: 30 } },
    { label: '31–60 jours', count: 0, amount: 0, days: { min: 31, max: 60 } },
    { label: '61–90 jours', count: 0, amount: 0, days: { min: 61, max: 90 } },
    { label: '+90 jours', count: 0, amount: 0, days: { min: 91, max: null } },
  ]

  for (const invoice of activeInvoices) {
    const dueDate = new Date(invoice.due_date)
    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    let bucket: AgingBucket | undefined

    if (daysDiff <= 0) {
      bucket = buckets[0]
    } else if (daysDiff <= 30) {
      bucket = buckets[1]
    } else if (daysDiff <= 60) {
      bucket = buckets[2]
    } else if (daysDiff <= 90) {
      bucket = buckets[3]
    } else {
      bucket = buckets[4]
    }

    if (bucket) {
      bucket.count++
      bucket.amount += invoice.amount
    }
  }

  return buckets
}

export function calculateDashboardMetrics(invoices: Invoice[]): DashboardMetrics {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const activeInvoices = invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'disputed')
  const overdueInvoices = activeInvoices.filter((inv) => new Date(inv.due_date) < today)

  const totalReceivables = activeInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  const paidThisMonth = invoices
    .filter((inv) => inv.status === 'paid' && new Date(inv.updated_at) >= startOfMonth)
    .reduce((sum, inv) => sum + inv.amount, 0)

  const statusBreakdown = {
    pending: invoices.filter((inv) => inv.status === 'pending').length,
    reminded: invoices.filter((inv) => inv.status === 'reminded').length,
    formal_notice: invoices.filter((inv) => inv.status === 'formal_notice').length,
    paid: invoices.filter((inv) => inv.status === 'paid').length,
    disputed: invoices.filter((inv) => inv.status === 'disputed').length,
  }

  return {
    totalReceivables: Math.round(totalReceivables * 100) / 100,
    totalOverdue: Math.round(totalOverdue * 100) / 100,
    dso: calculateDSO(invoices),
    recoveryRate: calculateRecoveryRate(invoices),
    invoiceCount: invoices.length,
    overdueCount: overdueInvoices.length,
    paidThisMonth: Math.round(paidThisMonth * 100) / 100,
    agingBuckets: calculateAgingBuckets(invoices),
    statusBreakdown,
  }
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

export function formatDateLong(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

export const PLAN_LIMITS: Record<string, number> = {
  free_trial: 10,
  starter: 30,
  pro: 200,
  business: 1000,
}

export function getPlanLimit(plan: string): number {
  return PLAN_LIMITS[plan] || 10
}
