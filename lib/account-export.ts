// Export RGPD (droit d'accès et de portabilité, art. 15 et 20) : toutes les
// données du compte, lues avec la session de l'utilisateur, donc sous RLS.
// Les secrets (jetons d'intégration, empreintes de clés, secret de webhook)
// ne sont jamais exportés : les colonnes sont listées une à une, sans `*`
// sauf pour les factures, qui ne contiennent que des données du client.

type Row = Record<string, unknown>
type Page = { data: Row[] | null; error: unknown }
type Query = {
  select(columns: string): Query
  eq(column: string, value: string): Query
  order(column: string, options?: { ascending?: boolean }): Query
  range(from: number, to: number): PromiseLike<Page>
}
export type ExportClient = { from(table: string): Pick<Query, 'select'> }

export type ExportSource = {
  key: string
  table: string
  columns: string
  scope?: 'id' | 'user_id'
  order?: string
  single?: boolean
}

export const ACCOUNT_EXPORT_SOURCES: readonly ExportSource[] = [
  { key: 'profil', table: 'profiles', scope: 'id', single: true, columns: 'id, email, company_name, siren, address, postal_code, city, phone, plan, subscription_status, trial_ends_at, auto_reminders, active_scenario, onboarding_completed_at, signup_terms_version, signup_terms_recorded_at, signup_professional_use, created_at, updated_at' },
  { key: 'factures', table: 'invoices', columns: '*' },
  { key: 'relances', table: 'reminders', columns: 'id, invoice_id, type, channel, status, subject, content, sent_at, delivered_at, opened_at, clicked_at, bounced_at, complained_at, created_at' },
  { key: 'notifications', table: 'notifications', columns: 'id, type, title, body, read, action_url, created_at' },
  { key: 'modeles_email', table: 'email_template_overrides', columns: 'id, template_type, subject, body, enabled, created_at, updated_at' },
  { key: 'scenarios', table: 'reminder_scenarios', columns: 'id, name, description, steps, is_active, created_at, updated_at' },
  { key: 'formats_import', table: 'import_presets', order: 'name', columns: 'name, headers, mapping, updated_at' },
  { key: 'contacts', table: 'contacts', columns: 'id, name, company, email, phone, tags, pipeline_stage, deal_amount, notes, created_at, updated_at' },
  { key: 'journal', table: 'journal_entries', columns: 'id, contact_id, type, content, duration_minutes, occurred_at, created_at' },
  { key: 'sequences', table: 'contact_sequences', columns: 'id, contact_id, status, current_step, next_send_at, started_at, created_at, updated_at' },
  { key: 'integrations', table: 'integrations', columns: 'id, provider, status, external_org_id, last_sync_at, last_sync_count, created_at, updated_at' },
  { key: 'cles_api', table: 'api_keys', columns: 'id, name, key_prefix, last_used_at, created_at' },
]

export const EXPORT_PAGE_SIZE = 1000
export const EXPORT_MAX_PAGES = 50

export type AccountExport = {
  format: 'encair-export-v1'
  genere_le: string
  compte: { id: string; email: string | null; cree_le: string | null }
  a_savoir: string[]
  donnees: Record<string, Row | Row[] | null>
}

export type ExportResult =
  | { ok: true; data: AccountExport }
  | { ok: false; reason: 'unavailable' | 'too_large' }

async function readAll(db: ExportClient, source: ExportSource, userId: string) {
  const rows: Row[] = []
  for (let page = 0; page < EXPORT_MAX_PAGES; page++) {
    const from = page * EXPORT_PAGE_SIZE
    const { data, error } = await db
      .from(source.table)
      .select(source.columns)
      .eq(source.scope ?? 'user_id', userId)
      .order(source.order ?? 'id', { ascending: true })
      .range(from, from + EXPORT_PAGE_SIZE - 1)
    if (error || !Array.isArray(data)) return { ok: false as const, reason: 'unavailable' as const }
    rows.push(...data)
    if (data.length < EXPORT_PAGE_SIZE) return { ok: true as const, rows }
  }
  // Un export tronqué serait trompeur : on refuse plutôt que d'omettre des lignes.
  return { ok: false as const, reason: 'too_large' as const }
}

export async function collectAccountExport(
  db: ExportClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  now: Date = new Date(),
): Promise<ExportResult> {
  const donnees: AccountExport['donnees'] = {}
  for (const source of ACCOUNT_EXPORT_SOURCES) {
    const result = await readAll(db, source, user.id)
    if (!result.ok) return result
    donnees[source.key] = source.single ? (result.rows[0] ?? null) : result.rows
  }
  return {
    ok: true,
    data: {
      format: 'encair-export-v1',
      genere_le: now.toISOString(),
      compte: { id: user.id, email: user.email ?? null, cree_le: user.created_at ?? null },
      a_savoir: [
        'Export de toutes les données de votre compte Encair (droits d’accès et de portabilité, articles 15 et 20 du RGPD).',
        'Les secrets ne sont pas exportés : jetons d’intégration, empreintes des clés d’API et secret de webhook.',
        'Les données de paiement sont détenues par Stripe : vos factures d’abonnement sont disponibles depuis la page Abonnement.',
        'Montants en euros. « amount » est le montant de la facture, « amount_paid » ce qui a déjà été réglé.',
      ],
      donnees,
    },
  }
}
