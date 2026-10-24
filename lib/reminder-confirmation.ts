import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Invoice, Profile, ReminderType } from './database.types'
import { outstanding } from './collection'
import { getDaysOverdue } from './metrics'
import { resolveEmailTemplate } from './email-templates'

export function reminderContent(invoice: Invoice, profile: Profile, type: ReminderType, override?: { subject: string; body: string; enabled: boolean } | null) {
  return resolveEmailTemplate(type, {
    creditorName: profile.company_name || 'Votre fournisseur', creditorEmail: profile.email,
    clientName: invoice.client_name, invoiceNumber: invoice.invoice_number,
    amount: outstanding(invoice), dueDate: invoice.due_date, daysOverdue: getDaysOverdue(invoice),
    invoiceId: invoice.id, description: invoice.description,
  }, override)
}
type Content = ReturnType<typeof reminderContent>
function signature(invoice: Invoice, profile: Profile, type: ReminderType, content: Content, expiry: number) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Confirmation indisponible.')
  return createHmac('sha256', secret).update(JSON.stringify([invoice.id, invoice.user_id, invoice.updated_at, invoice.client_email, profile.email, profile.company_name, type, content, expiry])).digest('hex')
}
export function createReminderConfirmation(invoice: Invoice, profile: Profile, type: ReminderType, content: Content, now = Date.now()) {
  const expiry = now + 600000
  return `${expiry}.${signature(invoice, profile, type, content, expiry)}`
}
export function validReminderConfirmation(token: unknown, invoice: Invoice, profile: Profile, type: ReminderType, content: Content, now = Date.now()) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false
  const [expiryText, digest] = token.split('.')
  const expiry = Number(expiryText)
  if (expiry < now || expiry > now + 600000) return false
  return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature(invoice, profile, type, content, expiry), 'hex'))
}
