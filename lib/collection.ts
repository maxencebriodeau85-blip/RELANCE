import { isValidDate, isValidEmail } from './validation'
import type { Invoice, ReminderType } from './database.types'
export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
export function outstanding(
  invoice: Pick<Invoice, 'amount' | 'status'> & { amount_paid?: number },
): number {
  if (invoice.status === 'paid') return 0
  // Round each ledger amount to cents before subtraction; never round
  // the floating-point difference between two monetary values.
  const originalCents = Math.round(Number(invoice.amount) * 100)
  const paidCents = Math.round(Number(invoice.amount_paid || 0) * 100)
  if (!Number.isSafeInteger(originalCents) || !Number.isSafeInteger(paidCents))
    return Number.NaN
  return Math.max(0, originalCents - paidCents) / 100
}
export function reminderBlock(
  invoice: Invoice,
  now = new Date(),
): string | null {
  const amount = Number(invoice.amount)
  const paid = Number(invoice.amount_paid ?? 0)
  if (
    !Number.isFinite(amount) || !Number.isFinite(paid) ||
    amount < 0 || paid < 0 || paid > amount ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    !Number.isSafeInteger(Math.round(paid * 100))
  ) return 'Le solde de cette facture est invalide. Vérifiez les montants avant de relancer.'
  if (invoice.status === 'paid' || outstanding(invoice) === 0)
    return 'Cette facture est réglée.'
  if (!isValidDate(invoice.due_date))
    return 'L’échéance de cette facture est invalide. Vérifiez-la avant de relancer.'
  if (!invoice.client_email || !isValidEmail(invoice.client_email))
    return 'Complétez l’adresse email du client avant de relancer.'
  if (invoice.status === 'disputed') return 'Cette facture est en litige.'
  if (invoice.reminders_paused !== false)
    return 'Les relances sont en pause sur cette facture.'
  if (invoice.promise_date && invoice.promise_date >= businessDate(now))
    return 'Une promesse de paiement est en cours.'
  const checked = Date.parse(invoice.balance_checked_at || '')
  if (
    !Number.isFinite(checked) ||
    checked > now.getTime() ||
    now.getTime() - checked > 7 * 86400000
  )
    return 'Confirmez le solde : la dernière vérification date de plus de sept jours.'
  if (invoice.due_date >= businessDate(now))
    return 'Cette facture n’est pas encore en retard.'
  return null
}
export const REMINDER_SCHEDULES: Record<
  string,
  { days: number; type: ReminderType }[]
> = {
  standard: [
    { days: 7, type: 'email_1' },
    { days: 15, type: 'email_2' },
    { days: 30, type: 'email_3' },
  ],
  soft: [
    { days: 7, type: 'email_1' },
    { days: 21, type: 'email_2' },
  ],
  firm: [
    { days: 3, type: 'email_1' },
    { days: 10, type: 'email_2' },
    { days: 20, type: 'email_3' },
  ],
}
export function nextReminder(
  days: number,
  scenario: string,
  completed: string[],
) {
  return (REMINDER_SCHEDULES[scenario] || REMINDER_SCHEDULES.standard).find(
    (step) => days >= step.days && !completed.includes(step.type),
  )
}
