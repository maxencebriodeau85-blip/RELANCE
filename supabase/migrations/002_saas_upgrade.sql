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
