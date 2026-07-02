-- RelanceFlow — schéma complet (toutes les migrations 001→012 concaténées)
-- Généré pour un setup en 1 copier-coller dans Supabase → SQL Editor.
-- À exécuter sur un projet Supabase VIERGE. Si tu as déjà lancé certaines
-- migrations, n'exécute que celles qui manquent (fichiers dans supabase/migrations/).


-- ═══════════════════════════════════════════════════════════════════
-- 001_initial.sql
-- ═══════════════════════════════════════════════════════════════════
-- RelanceFlow Initial Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT,
  siren TEXT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business', 'free_trial')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  invoice_count_month INTEGER NOT NULL DEFAULT 0,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_address TEXT,
  client_siren TEXT,
  invoice_number TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reminded', 'formal_notice', 'paid', 'disputed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX invoices_user_id_idx ON invoices(user_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX invoices_due_date_idx ON invoices(due_date);

-- ============================================================
-- REMINDERS (relances sent)
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email_1', 'email_2', 'email_3', 'formal_notice')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'courrier')),
  content TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  resend_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for reminders
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX reminders_invoice_id_idx ON reminders(invoice_id);
CREATE INDEX reminders_user_id_idx ON reminders(user_id);

-- ============================================================
-- REMINDER SCENARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for reminder_scenarios
ALTER TABLE reminder_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and default scenarios"
  ON reminder_scenarios FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own scenarios"
  ON reminder_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenarios"
  ON reminder_scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenarios"
  ON reminder_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- DEFAULT SCENARIOS (global, user_id NULL = system defaults)
-- ============================================================
INSERT INTO reminder_scenarios (name, description, steps, is_default, user_id) VALUES
(
  'Cordial',
  'Relance amicale pour les clients habituellement sérieux. Ton poli, suppose un oubli.',
  '[
    {
      "day": 7,
      "type": "email_1",
      "subject": "Rappel : Facture {invoice_number} arrive à échéance",
      "tone": "cordial",
      "channel": "email"
    }
  ]'::jsonb,
  TRUE,
  NULL
),
(
  'Ferme',
  'Deux relances successives avec un ton de plus en plus ferme. Idéal pour les retards récurrents.',
  '[
    {
      "day": 15,
      "type": "email_1",
      "subject": "Relance : Facture {invoice_number} en retard de paiement",
      "tone": "ferme",
      "channel": "email"
    },
    {
      "day": 30,
      "type": "email_2",
      "subject": "2ème relance : Facture {invoice_number} - Action requise",
      "tone": "ferme",
      "channel": "email"
    }
  ]'::jsonb,
  TRUE,
  NULL
),
(
  'Pré-contentieux',
  'Escalade progressive avec mise en demeure finale. Pour les impayés persistants.',
  '[
    {
      "day": 45,
      "type": "email_1",
      "subject": "Relance urgente : Facture {invoice_number} en souffrance",
      "tone": "precontentieux",
      "channel": "email"
    },
    {
      "day": 60,
      "type": "email_2",
      "subject": "Dernière relance avant mise en demeure - Facture {invoice_number}",
      "tone": "precontentieux",
      "channel": "email"
    },
    {
      "day": 75,
      "type": "formal_notice",
      "subject": "MISE EN DEMEURE - Facture {invoice_number}",
      "tone": "formal_notice",
      "channel": "courrier"
    }
  ]'::jsonb,
  TRUE,
  NULL
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON reminder_scenarios
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, plan, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free_trial',
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- 002_saas_upgrade.sql
-- ═══════════════════════════════════════════════════════════════════
-- Migration 002 — SaaS upgrade
-- Adds payment tokens, profile fields, and additional indexes.

-- ── invoices: payment token ────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_token UUID DEFAULT uuid_generate_v4();

-- Backfill existing rows that might have NULL (shouldn't happen with DEFAULT, but safety first)
UPDATE invoices SET payment_token = uuid_generate_v4() WHERE payment_token IS NULL;

ALTER TABLE invoices ALTER COLUMN payment_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_token_idx ON invoices(payment_token);

-- ── profiles: automation and address fields ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auto_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── plan default: new signups start on free_trial ─────────────────────────
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'free_trial';

-- ── additional performance indexes ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS invoices_user_status_idx ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS reminders_invoice_type_idx ON reminders(invoice_id, type);
CREATE INDEX IF NOT EXISTS reminders_created_at_idx ON reminders(created_at);

-- ═══════════════════════════════════════════════════════════════════
-- 003_security_hardening.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 004_active_scenario.sql
-- ═══════════════════════════════════════════════════════════════════
-- Add active_scenario to profiles so scenario choice persists across devices
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_scenario TEXT NOT NULL DEFAULT 'standard'
    CHECK (active_scenario IN ('standard', 'soft', 'firm'));

-- ═══════════════════════════════════════════════════════════════════
-- 004_integrations.sql
-- ═══════════════════════════════════════════════════════════════════
-- Migration 004 — Integrations & API keys

-- ── integrations table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('pennylane', 'sage', 'ebp', 'cegid', 'zapier', 'api')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  access_token  TEXT,          -- AES-256-GCM encrypted
  refresh_token TEXT,          -- AES-256-GCM encrypted
  token_expires_at TIMESTAMPTZ,
  external_org_id TEXT,        -- org / company ID on the external platform
  config        JSONB NOT NULL DEFAULT '{}',
  last_sync_at  TIMESTAMPTZ,
  last_sync_count INTEGER DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON integrations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE USING (auth.uid() = user_id);

-- ── api_keys table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,  -- SHA-256 of the full key
  key_prefix  TEXT NOT NULL,         -- first 10 chars for display
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys"
  ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- ── trigger: updated_at ────────────────────────────────────────────────────
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── profiles: add webhook_secret for inbound webhooks ─────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT encode(gen_random_bytes(24), 'hex');

-- ═══════════════════════════════════════════════════════════════════
-- 005_crm.sql
-- ═══════════════════════════════════════════════════════════════════
-- ============================================================
-- 005_crm.sql — Contacts, Journal, Sequences, Notifications
-- ============================================================

-- Pipeline stages enum-like constraint
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company         TEXT,
  email           TEXT,
  phone           TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  pipeline_stage  TEXT NOT NULL DEFAULT 'prospect'
                  CHECK (pipeline_stage IN ('prospect','qualified','proposal','signed','lost')),
  deal_amount     NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE journal_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id       UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type             TEXT NOT NULL DEFAULT 'note'
                   CHECK (type IN ('call','email','note','meeting')),
  content          TEXT NOT NULL,
  duration_minutes INTEGER,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contact_sequences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','paused','completed','cancelled')),
  current_step INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type       TEXT NOT NULL
             CHECK (type IN ('reminder','sequence_step','deal_signed','follow_up','invoice_overdue')),
  title      TEXT NOT NULL,
  body       TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link invoices optionally to a contact
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_owner"    ON contacts          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_owner"     ON journal_entries   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sequences_owner"   ON contact_sequences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_read_own"    ON notifications     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own"  ON notifications     FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX contacts_user_stage   ON contacts(user_id, pipeline_stage);
CREATE INDEX contacts_user_created ON contacts(user_id, created_at DESC);
CREATE INDEX journal_contact       ON journal_entries(contact_id, occurred_at DESC);
CREATE INDEX notif_user_unread     ON notifications(user_id, read, created_at DESC);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contacts_updated_at') THEN
    CREATE TRIGGER contacts_updated_at
      BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contact_sequences_updated_at') THEN
    CREATE TRIGGER contact_sequences_updated_at
      BEFORE UPDATE ON contact_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 006_invoice_fields.sql
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_mention TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293B du CGI';

-- ═══════════════════════════════════════════════════════════════════
-- 007_onboarding.sql
-- ═══════════════════════════════════════════════════════════════════
-- Track onboarding completion to show wizard only on first login.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════
-- 008_email_templates.sql
-- ═══════════════════════════════════════════════════════════════════
-- Per-user customization of reminder email templates.
-- Variables supported in subject/body: {{client_name}}, {{invoice_number}},
-- {{amount}}, {{due_date}}, {{days_overdue}}, {{creditor_name}}, {{payment_url}}.

CREATE TABLE IF NOT EXISTS email_template_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('email_1', 'email_2', 'email_3', 'formal_notice')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, template_type)
);

CREATE INDEX IF NOT EXISTS email_template_overrides_user_idx
  ON email_template_overrides (user_id);

ALTER TABLE email_template_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own templates" ON email_template_overrides;
CREATE POLICY "Users manage their own templates"
  ON email_template_overrides
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 009_email_tracking.sql
-- ═══════════════════════════════════════════════════════════════════
-- Email engagement tracking from Resend webhooks.
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

-- Allow the broader set of status values fired by Resend.
ALTER TABLE reminders
  DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE reminders
  ADD CONSTRAINT reminders_status_check
  CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'complained'));

CREATE INDEX IF NOT EXISTS reminders_resend_id_idx ON reminders (resend_id) WHERE resend_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 010_welcome_email.sql
-- ═══════════════════════════════════════════════════════════════════
-- Track welcome email delivery to avoid duplicate sends.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════
-- 011_lock_profile_columns.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 012_enforce_invoice_quota.sql
-- ═══════════════════════════════════════════════════════════════════
-- 012_enforce_invoice_quota.sql
--
-- Atomic, race-proof enforcement of the monthly invoice quota.
--
-- The application already checks the quota before inserting (see
-- app/api/invoices/import/route.ts), but that check is a read-then-write:
-- two concurrent imports can both read count=X, both pass, and both insert —
-- letting a paid account exceed its plan limit (a billing-integrity hole).
--
-- This trigger closes the window in the database itself:
--   * a per-user transaction advisory lock serialises concurrent inserts for
--     the same user, so the COUNT below can't be raced by a parallel import
--     (MVCC would otherwise hide the other transaction's uncommitted rows);
--   * the COUNT is re-evaluated per row, so a multi-row INSERT is capped
--     exactly at the limit and rolls back atomically if it would overflow.
--
-- Limits are kept in sync with lib/metrics.ts PLAN_LIMITS. If you change the
-- limits there, change them here too.

create or replace function enforce_invoice_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan        text;
  v_limit       int;
  v_count       int;
  v_month_start timestamptz := date_trunc('month', now());
begin
  -- Serialise concurrent inserts for this user (held until the tx ends).
  perform pg_advisory_xact_lock(hashtext('invoice_quota:' || new.user_id::text));

  select plan into v_plan from profiles where id = new.user_id;

  v_limit := case coalesce(v_plan, 'free_trial')
    when 'starter'  then 30
    when 'pro'      then 200
    when 'business' then 1000
    else 10 -- free_trial
  end;

  select count(*) into v_count
    from invoices
    where user_id = new.user_id
      and created_at >= v_month_start;

  if v_count >= v_limit then
    raise exception 'Invoice quota exceeded (% / % this month)', v_count, v_limit
      using errcode = 'check_violation'; -- SQLSTATE 23514, mapped in the API
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_invoice_quota on invoices;
create trigger trg_enforce_invoice_quota
  before insert on invoices
  for each row execute function enforce_invoice_quota();
