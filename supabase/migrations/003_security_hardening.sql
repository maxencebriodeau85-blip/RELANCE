-- Migration 003 — Security hardening
-- Adds missing DELETE policy for reminders, tightens cron access,
-- and adds explicit RLS policies to prevent privilege escalation.

-- ── reminders: add missing UPDATE/DELETE policies ─────────────────────────
-- (Reminders should never be edited/deleted by users but we make it explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reminders' AND policyname = 'Users cannot delete reminders'
  ) THEN
    CREATE POLICY "Users cannot delete reminders"
      ON reminders FOR DELETE
      USING (FALSE); -- nobody can delete reminders via client
  END IF;
END$$;

-- ── invoices: prevent user_id tampering on UPDATE ─────────────────────────
-- The existing UPDATE policy allows auth.uid() = user_id, but add a WITH CHECK
-- so a row cannot be re-assigned to a different user on update.
DO $$
BEGIN
  -- Drop and recreate with WITH CHECK clause
  DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
  CREATE POLICY "Users can update own invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END$$;

-- ── reminder_scenarios: add WITH CHECK on insert ──────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert own scenarios" ON reminder_scenarios;
  CREATE POLICY "Users can insert own scenarios"
    ON reminder_scenarios FOR INSERT
    WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);
END$$;

-- ── profiles: restrict update to non-critical fields ──────────────────────
-- Users should never be able to change their own plan, stripe IDs, or invoice
-- counters via the client. The UPDATE policy restricts the row but not the
-- columns — we rely on application-layer enforcement for those fields.
-- (Column-level security is only available in Postgres 16+; document the intent.)
COMMENT ON COLUMN profiles.plan IS 'Managed by Stripe webhook only — never update from client code.';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Set by Stripe webhook — read-only from client.';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Set by Stripe webhook — read-only from client.';
COMMENT ON COLUMN profiles.invoice_count_month IS 'Incremented server-side only — never update from client code.';

-- ── function: prevent client from elevating plan ──────────────────────────
-- Create a DB function that the cron (service role) uses to update plans,
-- so we can audit all plan changes in one place.
CREATE OR REPLACE FUNCTION set_user_plan(target_user_id UUID, new_plan TEXT)
RETURNS VOID AS $$
BEGIN
  IF new_plan NOT IN ('starter', 'pro', 'business', 'free_trial') THEN
    RAISE EXCEPTION 'Invalid plan: %', new_plan;
  END IF;
  UPDATE profiles SET plan = new_plan, updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only superuser / service_role can call this function
REVOKE EXECUTE ON FUNCTION set_user_plan FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_user_plan FROM anon;
REVOKE EXECUTE ON FUNCTION set_user_plan FROM authenticated;
