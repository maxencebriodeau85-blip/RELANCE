import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice, Reminder } from './database.types'
import { businessDate, outstanding } from './collection'
import { isValidEmail } from './validation'

export type CollectionInvoice = Pick<
  Invoice,
  | 'id'
  | 'user_id'
  | 'client_name'
  | 'client_email'
  | 'client_siren'
  | 'invoice_number'
  | 'amount'
  | 'amount_paid'
  | 'status'
  | 'due_date'
  | 'promise_date'
  | 'balance_checked_at'
  | 'reminders_paused'
  | 'notes'
  | 'paid_at'
>
export type CollectionReminder = Pick<
  Reminder,
  'id' | 'invoice_id' | 'status' | 'created_at' | 'subject' | 'type'
>
const invoiceFields =
  'id,user_id,client_name,client_email,client_siren,invoice_number,amount,amount_paid,status,due_date,promise_date,balance_checked_at,reminders_paused,notes,paid_at'
// Keyset pagination avoids the Data API row cap and offset drift on new imports.
export async function loadCollectionInvoices(
  db: SupabaseClient,
  owner: string,
) {
  const rows: CollectionInvoice[] = []
  let after = ''
  for (;;) {
    let query = db
      .from('invoices')
      .select(invoiceFields)
      .eq('user_id', owner)
      .order('id')
      .limit(500)
    if (after) query = query.gt('id', after)
    const { data, error } = await query
    if (error || !data)
      throw Error('Impossible de charger les factures. Réessayez.')
    rows.push(...(data as CollectionInvoice[]))
    if (data.length < 500) return rows
    after = data[data.length - 1].id
  }
}
export async function loadCollectionReminders(
  db: SupabaseClient,
  owner: string,
  since?: string,
  invoiceIds?: string[],
) {
  const rows: CollectionReminder[] = []
  // Small batches avoid oversized URLs for clients with many invoices.
  const batches = invoiceIds
    ? Array.from({ length: Math.ceil(invoiceIds.length / 50) }, (_, n) =>
        invoiceIds.slice(n * 50, n * 50 + 50),
      )
    : [undefined]
  for (const ids of batches) {
    let after = ''
    for (;;) {
      let query = db
        .from('reminders')
        .select('id,invoice_id,status,created_at,subject,type')
        .eq('user_id', owner)
        .order('id')
        .limit(500)
      if (after) query = query.gt('id', after)
      if (since) query = query.gte('created_at', since)
      if (ids) query = query.in('invoice_id', ids)
      const { data, error } = await query
      if (error || !data)
        throw Error('Impossible de charger l’historique des relances.')
      rows.push(...(data as CollectionReminder[]))
      if (data.length < 500) break
      after = data[data.length - 1].id
    }
  }
  return rows.sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  )
}
export const taskLabels = {
  email: 'Email à compléter',
  balance: 'Solde à vérifier',
  promise: 'Promesse dépassée',
  delivery: 'Envoi à vérifier',
} as const
export type TaskKind = keyof typeof taskLabels
export function collectionTasks(
  invoices: CollectionInvoice[],
  reminders: CollectionReminder[],
  now = new Date(),
) {
  const latest = new Map<string, CollectionReminder>()
  for (const r of reminders) {
    const old = latest.get(r.invoice_id)
    if (
      !old ||
      r.created_at > old.created_at ||
      (r.created_at === old.created_at && r.id > old.id)
    )
      latest.set(r.invoice_id, r)
  }
  return invoices
    .filter((i) => outstanding(i) > 0)
    .flatMap((invoice) => {
      const kinds: TaskKind[] = []
      if (!invoice.client_email || !isValidEmail(invoice.client_email))
        kinds.push('email')
      const checked = Date.parse(invoice.balance_checked_at || '')
      if (
        !Number.isFinite(checked) ||
        checked > now.getTime() ||
        now.getTime() - checked > 7 * 86400000
      )
        kinds.push('balance')
      if (invoice.promise_date && invoice.promise_date < businessDate(now))
        kinds.push('promise')
      const last = latest.get(invoice.id)
      if (
        last &&
        (['failed', 'bounced', 'complained'].includes(last.status) ||
          (last.status === 'pending' &&
            Date.parse(last.created_at) < now.getTime() - 15 * 60000))
      )
        kinds.push('delivery')
      return kinds.length ? [{ invoice, kinds }] : []
    })
    .sort(
      (a, b) =>
        Number(b.kinds.includes('delivery')) -
          Number(a.kinds.includes('delivery')) ||
        Number(b.kinds.includes('promise')) -
          Number(a.kinds.includes('promise')) ||
        a.invoice.due_date.localeCompare(b.invoice.due_date) ||
        a.invoice.id.localeCompare(b.invoice.id),
    )
}
const normalize = (value: string) =>
  value.trim().toLocaleLowerCase('fr').replace(/\s+/g, ' ')
export function customerKey(invoice: CollectionInvoice) {
  const siren = invoice.client_siren?.replace(/\s/g, '')
  if (siren && /^\d{9}$/.test(siren)) return `siren:${siren}`
  if (invoice.client_email && isValidEmail(invoice.client_email))
    return JSON.stringify([
      normalize(invoice.client_name),
      normalize(invoice.client_email),
    ])
  return `invoice:${invoice.id}`
}
export function groupCustomers(invoices: CollectionInvoice[]) {
  const groups = new Map<string, CollectionInvoice[]>()
  for (const invoice of invoices) {
    const key = customerKey(invoice)
    const group = groups.get(key) || []
    group.push(invoice)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((rows) => {
      rows.sort((a, b) => a.id.localeCompare(b.id))
      const first = rows[0]
      return {
        id: first.id,
        name: first.client_name,
        invoices: rows,
        uncertain: customerKey(first).startsWith('invoice:'),
        remaining:
          rows.reduce((sum, i) => sum + Math.round(outstanding(i) * 100), 0) /
          100,
        paid:
          rows.reduce(
            (sum, i) =>
              sum + Math.round((Number(i.amount) - outstanding(i)) * 100),
            0,
          ) / 100,
      }
    })
    .sort(
      (a, b) =>
        b.remaining - a.remaining ||
        a.name.localeCompare(b.name, 'fr') ||
        a.id.localeCompare(b.id),
    )
}
