-- Delivery history is written by trusted send/claim/webhook handlers only.
-- An account must not fabricate a sent email or claim a provider email ID.
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
REVOKE INSERT, UPDATE, DELETE ON public.reminders FROM anon, authenticated;
-- Keep the existing owner-only SELECT policy for the customer timeline.
