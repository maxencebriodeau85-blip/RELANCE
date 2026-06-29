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
