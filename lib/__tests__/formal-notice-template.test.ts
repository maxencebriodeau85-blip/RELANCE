import { describe, it, expect } from 'vitest'
import { calculatePenalties, type FormalNoticeData } from '../formal-notice-template'

// The numbers on a mise en demeure have legal weight (LRAR) — a silent
// regression here means a real formal notice sent to a real debtor with a
// wrong amount. These tests pin the formula from art. L441-10 / D441-5 so
// any future change to calculatePenalties is a deliberate, visible diff.

function baseData(overrides: Partial<FormalNoticeData> = {}): FormalNoticeData {
  return {
    creditorName: 'Jean Martin Conseil',
    creditorAddress: '1 rue de Paris, 75001 Paris',
    creditorEmail: 'jean@example.fr',
    debtorName: 'Acme Corp',
    debtorAddress: '2 avenue de Lyon, 69000 Lyon',
    invoiceNumber: 'F-2026-001',
    invoiceAmount: 2400,
    invoiceDueDate: '2026-03-15',
    invoiceIssuedDate: '2026-02-15',
    daysOverdue: 30,
    ...overrides,
  }
}

describe('calculatePenalties', () => {
  it('always charges the fixed statutory indemnity (art. D441-5)', () => {
    const result = calculatePenalties(baseData())
    expect(result.fixedIndemnity).toBe(40)
  })

  it('uses BCE refi rate + 10 points as the penalty rate (art. L441-10)', () => {
    const result = calculatePenalties(baseData())
    // Default BCE_REFI_RATE is 2.15 when the env var is unset.
    const expectedRate = Number(process.env.BCE_REFI_RATE ?? '2.15') + 10
    expect(result.penaltyRate).toBeCloseTo(expectedRate, 5)
  })

  it('computes a pro-rated daily penalty on the principal', () => {
    const result = calculatePenalties(baseData({ invoiceAmount: 2400, daysOverdue: 30 }))
    const expectedPenalty = (2400 * result.penaltyRate * 30) / (100 * 365)
    expect(result.penaltyAmount).toBeCloseTo(Math.round(expectedPenalty * 100) / 100, 2)
  })

  it('returns zero late-payment interest at zero days overdue, but still the 40€ indemnity', () => {
    const result = calculatePenalties(baseData({ daysOverdue: 0 }))
    expect(result.penaltyAmount).toBe(0)
    expect(result.totalPenalties).toBe(40)
    expect(result.totalDue).toBe(baseData().invoiceAmount + 40)
  })

  it('totalDue is always principal + penalties + fixed indemnity', () => {
    const data = baseData({ invoiceAmount: 1189.5, daysOverdue: 47 })
    const result = calculatePenalties(data)
    expect(result.totalDue).toBeCloseTo(
      result.principal + result.penaltyAmount + result.fixedIndemnity,
      2
    )
  })

  it('scales linearly with days overdue', () => {
    const at30 = calculatePenalties(baseData({ daysOverdue: 30 }))
    const at60 = calculatePenalties(baseData({ daysOverdue: 60 }))
    // Doubling the days should roughly double the interest portion
    // (not the fixed 40€ indemnity, which stays constant).
    expect(at60.penaltyAmount).toBeCloseTo(at30.penaltyAmount * 2, 1)
    expect(at60.fixedIndemnity).toBe(at30.fixedIndemnity)
  })

  it('rounds all monetary fields to 2 decimals', () => {
    const result = calculatePenalties(baseData({ invoiceAmount: 999.99, daysOverdue: 17 }))
    for (const field of ['penaltyAmount', 'totalPenalties', 'totalDue'] as const) {
      const value = result[field]
      expect(Math.round(value * 100) / 100).toBe(value)
    }
  })
})
