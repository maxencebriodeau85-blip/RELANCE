import type { Invoice } from './database.types'
export async function applyInvoiceAction(
  action: 'paid' | 'disputed' | 'delete',
  invoices: Pick<Invoice, 'id' | 'updated_at'>[],
) {
  if (!invoices.length || invoices.length > 100)
    throw new Error('Sélectionnez entre 1 et 100 factures.')
  const response = await fetch('/api/invoices/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      items: invoices.map(({ id, updated_at }) => ({ id, updated_at })),
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.success)
    throw new Error(
      data?.error ||
        'Action non confirmée. Rechargez la liste avant de réessayer.',
    )
  return data.affected as number
}
