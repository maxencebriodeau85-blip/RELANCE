export interface PaymentRecord { id: string; amount: number }

export function amountInCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Invalid amount')
  const cents = Math.round(amount * 100)
  if (!Number.isSafeInteger(cents)) throw new RangeError('Amount too large')
  return cents
}

export function remainingBalance(invoiceAmount: number, payments: readonly PaymentRecord[]): number {
  const seen = new Set<string>()
  const initial = amountInCents(invoiceAmount)
  let paid = 0
  for (const payment of payments) {
    if (!payment.id || seen.has(payment.id)) throw new Error('Duplicate or missing payment ID')
    seen.add(payment.id)
    paid += amountInCents(payment.amount)
    if (!Number.isSafeInteger(paid) || paid > initial) throw new RangeError('Overpayment')
  }
  return (initial - paid) / 100
}

export function canSendCollectionNotice(status: string, invoiceAmount: number, payments: readonly PaymentRecord[]): boolean {
  if (status === 'paid' || status === 'disputed') return false
  return remainingBalance(invoiceAmount, payments) > 0
}
