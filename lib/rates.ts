/**
 * Taux de référence des pénalités de retard entre professionnels
 * (art. L441-10 II du Code de commerce).
 *
 * Le taux par défaut est le taux de l'opération principale de refinancement
 * de la BCE, majoré de 10 points :
 *   - 1er semestre : taux en vigueur au 1er janvier ;
 *   - 2nd semestre : taux en vigueur au 1er juillet.
 *
 * À METTRE À JOUR chaque 1er janvier et 1er juillet (source : ecb.europa.eu,
 * rubrique « Key ECB interest rates »).
 */
export const BCE_REFERENCE_RATES = [
  { from: '2025-01-01', to: '2025-06-30', label: '1er semestre 2025', bceRate: 3.15 },
  { from: '2025-07-01', to: '2025-12-31', label: '2nd semestre 2025', bceRate: 2.15 },
  { from: '2026-01-01', to: '2026-06-30', label: '1er semestre 2026', bceRate: 2.15 },
  { from: '2026-07-01', to: '2026-12-31', label: '2nd semestre 2026', bceRate: 2.4 },
] as const

export const LATE_PENALTY_MARGIN = 10
export const FLAT_RECOVERY_FEE = 40

export type PenaltyRate = { rate: number; label: string; known: boolean }

/** Taux des pénalités pour une date (AAAA-MM-JJ). `known` = false hors des semestres renseignés. */
export function latePenaltyRate(isoDate?: string): PenaltyRate {
  const d = isoDate ?? new Date().toISOString().slice(0, 10)
  const found = BCE_REFERENCE_RATES.find((p) => d >= p.from && d <= p.to)
  const period =
    found ??
    (d < BCE_REFERENCE_RATES[0].from
      ? BCE_REFERENCE_RATES[0]
      : BCE_REFERENCE_RATES[BCE_REFERENCE_RATES.length - 1])
  return {
    rate: Math.round((period.bceRate + LATE_PENALTY_MARGIN) * 100) / 100,
    label: period.label,
    known: Boolean(found),
  }
}

/**
 * Pénalités de retard dues entre deux dates (exclue / incluse), calculées jour
 * par jour. Avec `fixedRate`, applique un taux contractuel unique ; sinon le
 * taux légal de chaque semestre.
 */
export function computeLatePenalties(
  principal: number,
  dueIso: string,
  todayIso: string,
  fixedRate?: number,
): { days: number; interest: number; allRatesKnown: boolean; periods: string[] } {
  const DAY = 86_400_000
  const due = Date.parse(`${dueIso}T00:00:00Z`)
  const today = Date.parse(`${todayIso}T00:00:00Z`)
  if (!Number.isFinite(due) || !Number.isFinite(today) || today <= due || principal <= 0) {
    return { days: 0, interest: 0, allRatesKnown: true, periods: [] }
  }
  let interest = 0
  let allRatesKnown = true
  const periods = new Set<string>()
  const days = Math.floor((today - due) / DAY)
  for (let i = 1; i <= days; i++) {
    const iso = new Date(due + i * DAY).toISOString().slice(0, 10)
    if (fixedRate !== undefined) {
      interest += (principal * fixedRate) / 100 / 365
      continue
    }
    const r = latePenaltyRate(iso)
    if (!r.known) allRatesKnown = false
    periods.add(`${r.label} : ${formatRate(r.rate)}`)
    interest += (principal * r.rate) / 100 / 365
  }
  return { days, interest: Math.round(interest * 100) / 100, allRatesKnown, periods: Array.from(periods) }
}

/** Format français d'un taux : 12.4 → « 12,40 % ». */
export function formatRate(rate: number): string {
  return `${rate.toFixed(2).replace('.', ',')} %`
}
