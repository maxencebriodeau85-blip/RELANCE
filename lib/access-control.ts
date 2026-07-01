import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_LIMITS } from '@/lib/metrics'

export type Plan = 'free_trial' | 'starter' | 'pro' | 'business'

// Plan hierarchy for feature gating (higher = more access).
const PLAN_RANK: Record<Plan, number> = {
  free_trial: 0,
  starter: 1,
  pro: 2,
  business: 3,
}

interface AccessProfile {
  plan: Plan
  trial_ends_at: string | null
}

export interface AccessResult {
  ok: boolean
  status: number
  error?: string
}

// Central guard for any mutating / paid route. Verifies the account is not a
// lapsed free-trial. Data is never touched — a lapsed account simply can't
// perform new actions until it upgrades.
export function assertActiveAccess(profile: AccessProfile | null): AccessResult {
  if (!profile) {
    return { ok: false, status: 404, error: 'Profil introuvable' }
  }
  if (profile.plan === 'free_trial') {
    // free_trial with a null trial_ends_at is treated as expired (fail-closed):
    // covers legacy rows and cancelled subscriptions reverted to free_trial.
    const expired =
      !profile.trial_ends_at || new Date(profile.trial_ends_at) < new Date()
    if (expired) {
      return {
        ok: false,
        status: 403,
        error: "Votre période d'essai est terminée. Passez à un plan payant pour continuer.",
      }
    }
  }
  return { ok: true, status: 200 }
}

// Feature gate by minimum plan (e.g. formal-notice = Pro, integrations = Business).
export function assertPlan(profile: AccessProfile | null, minPlan: Plan): AccessResult {
  const base = assertActiveAccess(profile)
  if (!base.ok) return base
  const current = PLAN_RANK[profile!.plan] ?? 0
  if (current < PLAN_RANK[minPlan]) {
    return {
      ok: false,
      status: 403,
      error: `Cette fonctionnalité nécessite le plan ${minPlan}. Mettez à niveau votre abonnement.`,
    }
  }
  return { ok: true, status: 200 }
}

// Real monthly invoice count (never drifts, unlike profiles.invoice_count_month).
// Returns how many invoices the user created since the 1st of the current
// UTC month.
export async function monthlyInvoiceCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())
  return count ?? 0
}

export function planLimit(plan: Plan | undefined): number {
  return PLAN_LIMITS[plan ?? 'free_trial'] ?? PLAN_LIMITS.free_trial
}
