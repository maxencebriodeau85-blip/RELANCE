-- Track welcome email delivery to avoid duplicate sends.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
