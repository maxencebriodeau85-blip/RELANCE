import type { Invoice } from './database.types'
import { outstanding, businessDate } from './collection'

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
  createdThisMonth: number
  agingBuckets: AgingBucket[]
  statusBreakdown: {
    pending: number
    reminded: number
    formal_notice: number
    paid: number
    disputed: number
  }
}

/** Historical function name retained for compatibility: mean time to recorded settlement, not DSO. */
export function calculateDSO(invoices: Invoice[]): number {
  const paid = invoices.filter(i => i.status === 'paid' && i.paid_at && i.issued_date)
  if (!paid.length) return 0
  return Math.round(paid.reduce((sum,i) => sum + Math.max(0, Math.floor((Date.parse(i.paid_at!) - Date.parse(i.issued_date!)) / 86400000)),0) / paid.length)
}

export function calculateRecoveryRate(invoices: Invoice[]): number {
  if (invoices.length === 0) return 0

  // Excludes 'disputed' invoices, consistent with calculateDashboardMetrics'
  // activeInvoices/overdueInvoices and the dashboard's urgentInvoices filter
  // elsewhere in this codebase — a disputed invoice is out of the normal
  // collection flow (rarely ever flips to 'paid' while disputed), so
  // counting it in the denominator here would permanently depress the
  // recovery rate for accounts with disputes, inconsistent with how every
  // other metric on the same dashboard treats disputed invoices.
  const overdueInvoices = invoices.filter((inv) => {
    const dueDate = new Date(inv.due_date)
    return dueDate < new Date() && inv.status !== 'disputed'
  })

  if (overdueInvoices.length === 0) return 100

  const paidFromOverdue = overdueInvoices.filter((inv) => inv.status === 'paid').length
  return Math.round((paidFromOverdue / overdueInvoices.length) * 100)
}

export function getDaysOverdue(invoice: Invoice): number {
  return Math.max(0, Math.round((Date.parse(businessDate()) - Date.parse(invoice.due_date)) / 86400000))
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
    const daysDiff = getDaysOverdue(invoice)

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
      bucket.amount += outstanding(invoice)
    }
  }

  return buckets
}

export function calculateDashboardMetrics(invoices: Invoice[]): DashboardMetrics {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const activeInvoices = invoices.filter((inv) => inv.status !== 'paid')
  const overdueInvoices = activeInvoices.filter((inv) => new Date(inv.due_date) < today)

  const totalReceivables = activeInvoices.reduce((sum, inv) => sum + outstanding(inv), 0)
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + outstanding(inv), 0)

  const paidThisMonth = invoices
    .filter((inv) => inv.status === 'paid' && inv.paid_at && new Date(inv.paid_at) >= startOfMonth)
    .reduce((sum, inv) => sum + inv.amount, 0)

  const createdThisMonth = invoices.filter(
    (inv) => new Date(inv.created_at) >= startOfMonth
  ).length

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
    createdThisMonth,
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

export function formatDate(dateString: string | null): string {
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

export function formatDateLong(dateString: string | null): string {
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

export { PLAN_LIMITS } from './plans'
import { PLAN_LIMITS } from './plans'

export function getPlanLimit(plan: string): number {
  return PLAN_LIMITS[plan] || 10
}
