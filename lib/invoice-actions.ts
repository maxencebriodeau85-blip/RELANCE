import type { Invoice } from './database.types'

export type InvoiceAction = 'paid' | 'disputed' | 'delete' | 'activate' | 'pause'

export async function applyInvoiceAction(
  action: InvoiceAction,
  invoices: Pick<Invoice, 'id' | 'updated_at'>[],
) {
  return (await applyInvoiceActionDetailed(action, invoices)).affected
}

/**
 * Même appel, avec le détail : `skipped` compte les factures laissées telles
 * quelles (par exemple, pour « activate », réglées, en litige ou sans email).
 */
export async function applyInvoiceActionDetailed(
  action: InvoiceAction,
  invoices: Pick<Invoice, 'id' | 'updated_at'>[],
): Promise<{ affected: number; skipped: number }> {
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
  return { affected: Number(data.affected) || 0, skipped: Number(data.skipped) || 0 }
}

/** Applique l'action par lots de 100 (limite de l'API) et additionne les résultats. */
export async function applyInvoiceActionInBatches(
  action: InvoiceAction,
  invoices: Pick<Invoice, 'id' | 'updated_at'>[],
): Promise<{ affected: number; skipped: number }> {
  const total = { affected: 0, skipped: 0 }
  for (let i = 0; i < invoices.length; i += 100) {
    const result = await applyInvoiceActionDetailed(action, invoices.slice(i, i + 100))
    total.affected += result.affected
    total.skipped += result.skipped
  }
  return total
}
