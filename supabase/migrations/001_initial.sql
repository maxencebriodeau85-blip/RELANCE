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
