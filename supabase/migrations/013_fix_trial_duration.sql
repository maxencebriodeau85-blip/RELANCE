-- 013_fix_trial_duration.sql
--
-- Bug: the signup trigger and the column default both granted a 14-day free
-- trial, while every public-facing page (landing, pricing, register, emails)
-- promises 30 days. Confirmed live in production: an account created
-- 2026-07-06 got trial_ends_at = 2026-07-20 (14 days), not 30 — a real
-- discrepancy between what's sold and what's delivered.
--
-- Fixes, in order:
--   1. Column default → 30 days, for any future direct insert bypassing the
--      trigger (e.g. admin tooling, tests).
--   2. handle_new_user() → 30 days, so every new signup gets what's promised.
--   3. Backfill: extend still-on-trial accounts to created_at + 30 days, but
--      ONLY the ones whose trial_ends_at still matches the old 14-day default
--      (within a few seconds' tolerance) — this protects any account whose
--      trial was later hand-adjusted (e.g. a support gesture) from being
--      silently overwritten.

ALTER TABLE profiles
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days');

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, plan, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free_trial',
    NOW() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE profiles
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE plan = 'free_trial'
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at BETWEEN created_at + INTERVAL '14 days' - INTERVAL '5 minutes'
                         AND created_at + INTERVAL '14 days' + INTERVAL '5 minutes';
