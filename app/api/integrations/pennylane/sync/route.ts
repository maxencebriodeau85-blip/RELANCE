// POST /api/integrations/pennylane/sync — sync invoices from Pennylane
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchInvoices, mapPennylaneInvoice, refreshToken } from '@/lib/integrations/pennylane'
import { decrypt, encrypt } from '@/lib/crypto'

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // Called internally (post-OAuth) with x-user-id header
  const internalUserId = request.headers.get('x-user-id')
  const internalSecret = request.headers.get('x-internal')
  if (internalUserId && internalSecret === process.env.CRON_SECRET) {
    return internalUserId
  }

  // Called by authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const adminSupabase = await createAdminClient()

  // Fetch integration record
  const { data: integration, error: intErr } = await adminSupabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'pennylane')
    .single()

  if (intErr || !integration) {
    return NextResponse.json({ error: 'Intégration Pennylane introuvable' }, { status: 404 })
  }

  const intData = integration as any

  let accessToken: string
  try {
    // Refresh token if expired or expiring in < 5 minutes
    const expiresAt = new Date(intData.token_expires_at || 0).getTime()
    if (Date.now() > expiresAt - 300_000 && intData.refresh_token) {
      const decRefresh = await decrypt(intData.refresh_token)
      const newToken = await refreshToken(decRefresh)
      const [encAccess, encRefresh] = await Promise.all([
        encrypt(newToken.access_token),
        encrypt(newToken.refresh_token || decRefresh),
      ])
      await adminSupabase.from('integrations').update({
        access_token:     encAccess,
        refresh_token:    encRefresh,
        token_expires_at: new Date(Date.now() + (newToken.expires_in ?? 3600) * 1000).toISOString(),
        status: 'active',
      } as never).eq('id', intData.id)
      accessToken = newToken.access_token
    } else {
      accessToken = await decrypt(intData.access_token)
    }
  } catch {
    await adminSupabase.from('integrations').update({ status: 'error', last_error: 'Token invalide' } as never).eq('id', intData.id)
    return NextResponse.json({ error: 'Token expiré — reconnectez Pennylane' }, { status: 401 })
  }

  // Fetch all outstanding invoices (paginated)
  let page = 1
  let totalImported = 0
  let totalSkipped = 0

  try {
    while (true) {
      const data = await fetchInvoices(accessToken, page)
      if (!data.customer_invoices?.length) break

      for (const inv of data.customer_invoices) {
        // Skip invoices without email (can't send reminders)
        if (!inv.customer?.emails?.length) { totalSkipped++; continue }

        // Check if already imported (by invoice_number)
        const { data: existing } = await adminSupabase
          .from('invoices')
          .select('id')
          .eq('user_id', userId)
          .eq('invoice_number', inv.invoice_number)
          .maybeSingle()

        if (existing) { totalSkipped++; continue }

        const toInsert = mapPennylaneInvoice(inv, userId)
        const { error: insertErr } = await adminSupabase.from('invoices').insert(toInsert as never)
        if (!insertErr) totalImported++
      }

      if (page >= data.total_pages) break
      page++
    }

    // Update sync stats
    await adminSupabase.from('integrations').update({
      last_sync_at:    new Date().toISOString(),
      last_sync_count: totalImported,
      status:          'active',
      last_error:      null,
    } as never).eq('id', intData.id)

    // Update monthly counter
    if (totalImported > 0) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('invoice_count_month')
        .eq('id', userId)
        .single()
      const current = (profile as any)?.invoice_count_month ?? 0
      await adminSupabase.from('profiles').update({
        invoice_count_month: current + totalImported,
      } as never).eq('id', userId)
    }

    return NextResponse.json({ success: true, imported: totalImported, skipped: totalSkipped })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    await adminSupabase.from('integrations').update({ status: 'error', last_error: msg } as never).eq('id', intData.id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
