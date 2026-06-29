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
