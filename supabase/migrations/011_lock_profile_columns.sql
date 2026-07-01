-- SECURITY FIX (audit 2026-07): the profiles UPDATE RLS policy allowed an
-- authenticated user to modify ANY column of their own row — including plan,
-- stripe_customer_id, stripe_subscription_id and invoice_count_month.
--
-- A user could therefore self-upgrade to 'business' or reset their monthly
-- quota straight from the browser console:
--   supabase.from('profiles').update({ plan: 'business' }).eq('id', myUid)
--
-- The migration 003 only added COMMENTs ("Managed by Stripe webhook only"),
-- which enforce nothing. This trigger enforces it for real: any attempt to
-- change a billing-controlled column is rejected unless the request runs as
-- the service_role (Stripe webhook / admin client), which bypasses RLS and
-- runs as the table owner.

CREATE OR REPLACE FUNCTION protect_profile_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role / table owner bypasses this guard (webhook, admin client).
  -- current_setting('role') is 'authenticated' for end users via PostgREST.
  IF current_user = 'authenticated' THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.invoice_count_month IS DISTINCT FROM OLD.invoice_count_month
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    THEN
      RAISE EXCEPTION 'Colonnes de facturation non modifiables (plan, stripe_*, quota, trial).'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_billing_columns();

-- Defense in depth: a positive amount is required on every invoice, so a
-- direct API insert (bypassing the client CSV parser) cannot store a
-- negative/zero amount that would corrupt dashboard totals.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_amount_positive;
ALTER TABLE invoices ADD CONSTRAINT invoices_amount_positive CHECK (amount > 0);
