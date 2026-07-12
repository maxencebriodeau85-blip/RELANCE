import { describe, it, expect } from 'vitest'
import {
  calculateDSO,
  calculateRecoveryRate,
  getDaysOverdue,
  calculateAgingBuckets,
  getPlanLimit,
  PLAN_LIMITS,
} from '../metrics'
import type { Invoice } from '../database.types'

// Dates are computed relative to "now" at test-run time rather than hardcoded
// literals, so these tests stay correct regardless of when they run.
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function daysFromNow(n: number): string {
  return daysAgo(-n)
}

let idCounter = 0
function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  idCounter++
  return {
    id: `inv-${idCounter}`,
    user_id: 'user-1',
    client_name: 'Client Test',
    client_email: 'client@example.fr',
    client_address: null,
    client_siren: null,
    invoice_number: `F-${idCounter}`,
    amount: 1000,
    due_date: daysAgo(0),
    issued_date: daysAgo(30),
    status: 'pending',
    notes: null,
    description: null,
    vat_mention: 'TVA non applicable, art. 293B du CGI',
    payment_token: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
    ...overrides,
  } as Invoice
}

describe('getDaysOverdue', () => {
  it('returns 0 for an invoice not yet due', () => {
    expect(getDaysOverdue(makeInvoice({ due_date: daysFromNow(5) }))).toBe(0)
  })

  it('returns the number of days past the due date', () => {
    expect(getDaysOverdue(makeInvoice({ due_date: daysAgo(15) }))).toBe(15)
  })
})

describe('calculateAgingBuckets', () => {
  it('sorts overdue invoices into the correct bucket by days overdue', () => {
    const invoices = [
      makeInvoice({ due_date: daysFromNow(5), amount: 100 }), // à échoir
      makeInvoice({ due_date: daysAgo(10), amount: 200 }), // 1-30
      makeInvoice({ due_date: daysAgo(45), amount: 300 }), // 31-60
      makeInvoice({ due_date: daysAgo(75), amount: 400 }), // 61-90
      makeInvoice({ due_date: daysAgo(120), amount: 500 }), // +90
    ]
    const buckets = calculateAgingBuckets(invoices)
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 1, 1, 1])
    expect(buckets.map((b) => b.amount)).toEqual([100, 200, 300, 400, 500])
  })

  it('excludes paid invoices entirely', () => {
    const invoices = [makeInvoice({ due_date: daysAgo(100), status: 'paid', amount: 999 })]
    const buckets = calculateAgingBuckets(invoices)
    expect(buckets.every((b) => b.count === 0)).toBe(true)
  })

  it('places a bucket boundary (exactly 30 days) in the 1-30 bucket, not 31-60', () => {
    const invoices = [makeInvoice({ due_date: daysAgo(30) })]
    const buckets = calculateAgingBuckets(invoices)
    expect(buckets[1].count).toBe(1) // '1–30 jours'
    expect(buckets[2].count).toBe(0) // '31–60 jours'
  })
})

describe('calculateRecoveryRate', () => {
  it('returns 100 when there are no overdue invoices', () => {
    const invoices = [makeInvoice({ due_date: daysFromNow(10) })]
    expect(calculateRecoveryRate(invoices)).toBe(100)
  })

  it('returns the percentage of overdue invoices that ended up paid', () => {
    const invoices = [
      makeInvoice({ due_date: daysAgo(5), status: 'paid' }),
      makeInvoice({ due_date: daysAgo(5), status: 'paid' }),
      makeInvoice({ due_date: daysAgo(5), status: 'pending' }),
      makeInvoice({ due_date: daysAgo(5), status: 'pending' }),
    ]
    expect(calculateRecoveryRate(invoices)).toBe(50)
  })

  it('excludes disputed invoices from the denominator, consistent with the rest of the dashboard', () => {
    const invoices = [
      makeInvoice({ due_date: daysAgo(5), status: 'paid' }),
      makeInvoice({ due_date: daysAgo(5), status: 'disputed' }),
      makeInvoice({ due_date: daysAgo(5), status: 'disputed' }),
    ]
    // Without the fix, this would be 1/3 = 33% — permanently depressed by
    // disputed invoices that are excluded everywhere else on the dashboard.
    expect(calculateRecoveryRate(invoices)).toBe(100)
  })
})

describe('calculateDSO', () => {
  it('returns 0 for an empty invoice list', () => {
    expect(calculateDSO([])).toBe(0)
  })

  it('averages days-overdue when nothing has been paid yet', () => {
    const invoices = [
      makeInvoice({ due_date: daysAgo(10), status: 'pending' }),
      makeInvoice({ due_date: daysAgo(20), status: 'pending' }),
    ]
    expect(calculateDSO(invoices)).toBe(15)
  })

  it('averages issued-to-paid days when invoices have been paid', () => {
    const issued = daysAgo(40)
    const paid = daysAgo(20) // paid 20 days after issue -> updated_at
    const invoices = [
      makeInvoice({ issued_date: issued, updated_at: paid, status: 'paid' }),
    ]
    expect(calculateDSO(invoices)).toBe(20)
  })
})

describe('getPlanLimit / PLAN_LIMITS', () => {
  it('matches the limits enforced by migration 012 (enforce_invoice_quota)', () => {
    expect(PLAN_LIMITS).toEqual({
      free_trial: 10,
      starter: 30,
      pro: 200,
      business: 1000,
    })
  })

  it('falls back to the free_trial limit for an unknown plan', () => {
    expect(getPlanLimit('nonexistent-plan')).toBe(10)
  })

  for (const [plan, limit] of Object.entries({ free_trial: 10, starter: 30, pro: 200, business: 1000 })) {
    it(`returns ${limit} for plan "${plan}"`, () => {
      expect(getPlanLimit(plan)).toBe(limit)
    })
  }
})
