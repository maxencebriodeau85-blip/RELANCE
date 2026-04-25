-- Seed data for local development
-- Insère des factures de test pour le compte de développement
-- Run after: supabase db reset

-- Note: Remplacez 'YOUR_USER_ID' par l'UUID de votre compte de test
-- (visible dans Supabase Studio → Authentication → Users)

-- Les scénarios par défaut sont déjà insérés dans la migration 001_initial.sql

-- Exemple de données de test (décommentez et adaptez) :
/*
INSERT INTO profiles (id, company_name, siren, email, plan) VALUES
  ('YOUR_USER_ID', 'Agence Web Nantes', '123456789', 'sophie@agence-nantes.fr', 'pro');

INSERT INTO invoices (user_id, client_name, client_email, client_address, invoice_number, amount, due_date, issued_date, status) VALUES
  ('YOUR_USER_ID', 'Acme Corp SARL', 'compta@acme.fr', '15 rue de la Paix, 75001 Paris', 'FA-2024-001', 4500.00, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '75 days', 'reminded'),
  ('YOUR_USER_ID', 'TechStart SAS', 'finance@techstart.fr', '8 avenue des Entrepreneurs, 69003 Lyon', 'FA-2024-002', 12800.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '60 days', 'formal_notice'),
  ('YOUR_USER_ID', 'Dupont & Fils', 'dupont@dupont-fils.com', '22 rue du Commerce, 33000 Bordeaux', 'FA-2024-003', 2300.00, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '120 days', 'paid'),
  ('YOUR_USER_ID', 'Martin Solutions', 'contact@martin-solutions.fr', '5 boulevard Haussmann, 75009 Paris', 'FA-2024-004', 6750.00, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '40 days', 'pending'),
  ('YOUR_USER_ID', 'Innovatech', 'admin@innovatech.fr', '3 rue de la Technologie, 31000 Toulouse', 'FA-2024-005', 3200.00, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE - INTERVAL '25 days', 'pending');
*/
