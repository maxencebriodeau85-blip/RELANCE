import { describe, expect, it } from 'vitest'
import { MIN_TRIAL_CARRYOVER_MS, trialCarryoverEnd } from '../plans'

const NOW = Date.parse('2026-10-31T12:00:00Z')
const at = (ms: number) => new Date(NOW + ms).toISOString()

describe('Report de l’essai restant sur l’abonnement Stripe', () => {
  it('reporte la fin d’un essai en cours, à la seconde près', () => {
    const end = at(12 * 86_400_000)
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: end }, NOW)).toBe(Math.floor(Date.parse(end) / 1000))
  })
  it('paiement immédiat si l’essai finit dans moins de 49 heures (minimum Stripe : 48 h)', () => {
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: at(MIN_TRIAL_CARRYOVER_MS - 1000) }, NOW)).toBeNull()
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: at(MIN_TRIAL_CARRYOVER_MS) }, NOW)).not.toBeNull()
  })
  it('jamais pour un essai terminé, absent, illisible ou un compte déjà abonné', () => {
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: at(-1000) }, NOW)).toBeNull()
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: null }, NOW)).toBeNull()
    expect(trialCarryoverEnd({ plan: 'free_trial', trial_ends_at: 'pas une date' }, NOW)).toBeNull()
    expect(trialCarryoverEnd({ plan: 'starter', trial_ends_at: at(20 * 86_400_000) }, NOW)).toBeNull()
    expect(trialCarryoverEnd(null, NOW)).toBeNull()
  })
})
