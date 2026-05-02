-- Add payment_token to invoices for debtor payment links
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_token UUID DEFAULT uuid_generate_v4();
CREATE UNIQUE INDEX IF NOT EXISTS invoices_payment_token_idx ON invoices(payment_token);

-- Add automation + company details to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_reminders BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Backfill payment_token for existing invoices that somehow got NULL
UPDATE invoices SET payment_token = uuid_generate_v4() WHERE payment_token IS NULL;
