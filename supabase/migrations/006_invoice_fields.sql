ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_mention TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293B du CGI';
