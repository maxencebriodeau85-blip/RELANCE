import type { SupabaseClient } from '@supabase/supabase-js'
import type { Invoice } from '@/lib/database.types'

export interface CollectionOverview {
  invoice_count: number
  active_count: number
  outstanding: number
  overdue_count: number
  overdue: number
  promise_count: number
  promised: number
  disputed: number
  stale_count: number
  has_verified: boolean
  aging: { label: string; count: number; amount: number }[]
  priorities: Invoice[]
}

export async function loadCollectionOverview(db: SupabaseClient): Promise<CollectionOverview> {
  const { data, error } = await db.rpc('collection_overview')
  if (error || !data || typeof data.invoice_count !== 'number' || !Array.isArray(data.aging) || !Array.isArray(data.priorities)) {
    throw new Error('Impossible de charger les totaux de vos factures. Réessayez dans un instant.')
  }
  return data as CollectionOverview
}
