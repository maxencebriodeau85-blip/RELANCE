import { describe, expect, it } from 'vitest'
import { canSendCollectionNotice, remainingBalance } from './receivables'

describe('outstanding invoice balance', () => {
  it('deducts a partial payment', () => {
    expect(remainingBalance(2869.66, [{ id: 'p1', amount: 506.51 }])).toBe(2363.15)
  })
  it('avoids decimal floating-point drift', () => {
    expect(remainingBalance(0.3, [{ id: 'p1', amount: 0.1 }, { id: 'p2', amount: 0.2 }])).toBe(0)
  })
  it('rejects duplicate payment identifiers', () => {
    expect(() => remainingBalance(100, [{ id: 'p1', amount: 10 }, { id: 'p1', amount: 10 }])).toThrow()
  })
  it('rejects overpayments and invalid amounts', () => {
    expect(() => remainingBalance(100, [{ id: 'p1', amount: 101 }])).toThrow()
    expect(() => remainingBalance(-1, [])).toThrow()
  })
  it('blocks collection for settled or disputed invoices', () => {
    expect(canSendCollectionNotice('paid', 100, [])).toBe(false)
    expect(canSendCollectionNotice('disputed', 100, [])).toBe(false)
    expect(canSendCollectionNotice('pending', 100, [{ id: 'p1', amount: 100 }])).toBe(false)
    expect(canSendCollectionNotice('pending', 100, [{ id: 'p1', amount: 50 }])).toBe(true)
  })
})
