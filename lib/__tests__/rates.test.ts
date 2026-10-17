import { describe, expect, it } from 'vitest'
import { computeLatePenalties, latePenaltyRate } from '../rates'

describe('latePenaltyRate', () => {
  it('applique le taux du 1er juillet au second semestre 2026', () => {
    expect(latePenaltyRate('2026-10-13')).toMatchObject({ rate: 12.4, known: true })
  })
  it('applique le taux du 1er janvier au premier semestre 2026', () => {
    expect(latePenaltyRate('2026-03-01')).toMatchObject({ rate: 12.15, known: true })
  })
  it('signale un semestre non renseigné', () => {
    expect(latePenaltyRate('2027-02-01').known).toBe(false)
  })
})

describe('computeLatePenalties', () => {
  it('ne compte rien avant l’échéance', () => {
    expect(computeLatePenalties(1000, '2026-10-20', '2026-10-13').days).toBe(0)
    expect(computeLatePenalties(1000, '2026-10-13', '2026-10-13').interest).toBe(0)
  })
  it('reproduit l’exemple du guide (5 000 € sur 60 jours à 12,40 %)', () => {
    const r = computeLatePenalties(5000, '2026-08-01', '2026-09-30')
    expect(r.days).toBe(60)
    expect(r.interest).toBe(101.92)
  })
  it('change de taux au passage de semestre', () => {
    const r = computeLatePenalties(10000, '2026-06-20', '2026-07-10')
    expect(r.periods).toHaveLength(2)
  })
  it('applique un taux contractuel fixe', () => {
    expect(computeLatePenalties(1200, '2026-09-15', '2026-10-28', 12.4).interest).toBe(17.53)
  })
})
