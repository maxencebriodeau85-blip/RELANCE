-- Closes a TOCTOU race in the reminder cron (app/api/cron/reminders/route.ts):
-- it used to SELECT for an existing 'sent' reminder, then INSERT one after
-- sending the email, with no DB constraint between the two steps. If Vercel
-- retries the cron invocation while the first run is still in flight (a
-- documented Vercel cron behavior), both runs can pass the SELECT check
-- before either INSERTs, and the SAME debtor gets the SAME reminder email
-- (including formal_notice, which carries legal weight) sent twice.
--
-- Fix: the route now atomically claims a reminder slot by inserting a
-- 'pending' row BEFORE sending the email, relying on this partial unique
-- index to reject a second concurrent claim for the same invoice+type. A
-- 'failed' row is excluded from the index so a later retry can still claim
-- a fresh slot after a failed send.

ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE reminders ADD CONSTRAINT reminders_status_check
  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced'));

CREATE UNIQUE INDEX IF NOT EXISTS reminders_invoice_type_active_idx
  ON reminders(invoice_id, type)
  WHERE status IN ('pending', 'sent');
