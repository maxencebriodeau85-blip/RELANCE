-- Missing recipient details must not prevent tracking an invoice.
ALTER TABLE public.invoices ALTER COLUMN client_email DROP NOT NULL;
ALTER TABLE public.invoices ADD CONSTRAINT invoice_client_email_valid
  CHECK (client_email IS NULL OR (length(client_email) <= 254 AND client_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'));

-- An empty incoming email preserves an existing address. Filling a missing
-- address is allowed; changing a known recipient remains an explicit edit.
CREATE OR REPLACE FUNCTION public.import_collection_invoices(rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); item jsonb; existing public.invoices%ROWTYPE;
 total numeric; remaining numeric; added int := 0; changed int := 0; skipped int := 0; seen text[] := ARRAY[]::text[]; ref text; email_value text; p public.profiles%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM profiles WHERE id = uid;
 IF NOT FOUND OR (p.plan = 'free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE = '42501'; END IF;
 IF rows IS NULL OR jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows) < 1 OR jsonb_array_length(rows) > 500 THEN RAISE EXCEPTION 'Import invalide' USING ERRCODE = '22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
  ref := btrim(item->>'invoice_number');
  email_value := nullif(lower(btrim(item->>'client_email')),'');
  IF item->>'client_email' IS NOT NULL AND jsonb_typeof(item->'client_email') <> 'string' THEN RAISE EXCEPTION 'Email invalide' USING ERRCODE='22023'; END IF;
  IF ref = ANY(seen) THEN RAISE EXCEPTION 'Référence répétée dans le fichier : %', ref USING ERRCODE='22023'; END IF;
  seen := array_append(seen,ref);
  IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'amount') IS DISTINCT FROM 'number' OR (item->>'remaining_amount' IS NOT NULL AND jsonb_typeof(item->'remaining_amount') <> 'number') THEN RAISE EXCEPTION 'Montant invalide' USING ERRCODE='22023'; END IF;
  total := (item->>'amount')::numeric;
  remaining := coalesce((item->>'remaining_amount')::numeric,total);
  IF total IS NULL OR item->>'due_date' IS NULL OR item->>'invoice_number' IS NULL OR item->>'client_name' IS NULL OR total <> round(total,2) OR remaining <> round(remaining,2) OR total <= 0 OR total > 10000000 OR remaining < 0 OR remaining > total OR length(trim(item->>'invoice_number')) NOT BETWEEN 1 AND 50 OR length(trim(item->>'client_name')) NOT BETWEEN 1 AND 200 OR (email_value IS NOT NULL AND (length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')) THEN RAISE EXCEPTION 'Ligne invalide' USING ERRCODE = '22023'; END IF;
  IF item->>'issued_date' IS NOT NULL AND (item->>'issued_date')::date > (item->>'due_date')::date THEN RAISE EXCEPTION 'Échéance antérieure à l’émission' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM invoices WHERE user_id = uid AND btrim(invoice_number) = ref FOR UPDATE;
  IF FOUND THEN
   IF item ? 'expected_updated_at' AND ((item->>'expected_updated_at') IS NULL OR existing.updated_at IS DISTINCT FROM (item->>'expected_updated_at')::timestamptz) THEN RAISE EXCEPTION 'Facture modifiée depuis l’aperçu' USING ERRCODE='40001'; END IF;
   IF existing.amount <> total OR (nullif(btrim(existing.client_email),'') IS NOT NULL AND email_value IS NOT NULL AND lower(existing.client_email) <> email_value) THEN RAISE EXCEPTION 'La référence % existe avec un autre montant ou email. Vérifiez votre fichier.',existing.invoice_number USING ERRCODE = '22023'; END IF;
   IF item ? 'remaining_amount' AND item->>'remaining_amount' IS NOT NULL THEN
    UPDATE invoices SET amount_paid = total - remaining,
      status = CASE WHEN remaining = 0 THEN 'paid' WHEN status = 'paid' THEN 'pending' ELSE status END,
      balance_checked_at = now(), updated_at = now() WHERE id = existing.id;
    changed := changed + 1;
   ELSIF nullif(btrim(existing.client_email),'') IS NULL AND email_value IS NOT NULL THEN changed := changed + 1;
   ELSE skipped := skipped + 1; END IF;
   IF nullif(btrim(existing.client_email),'') IS NULL AND email_value IS NOT NULL THEN
    UPDATE invoices SET client_email=email_value, reminders_paused=true, updated_at=now() WHERE id=existing.id;
   END IF;
  ELSE
   IF item->>'expected_updated_at' IS NOT NULL THEN RAISE EXCEPTION 'Facture supprimée depuis l’aperçu' USING ERRCODE='40001'; END IF;
   INSERT INTO invoices(user_id,client_name,client_email,invoice_number,amount,amount_paid,due_date,issued_date,client_address,client_siren,balance_checked_at,reminders_paused,status)
    VALUES(uid,item->>'client_name',email_value,ref,total,total-remaining,(item->>'due_date')::date,(item->>'issued_date')::date,item->>'client_address',item->>'client_siren',CASE WHEN item->>'remaining_amount' IS NOT NULL THEN now() ELSE null END,true,CASE WHEN remaining=0 THEN 'paid' ELSE 'pending' END);
   added := added + 1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',added,'updated',changed,'unchanged',skipped);
END $$;
REVOKE ALL ON FUNCTION public.import_collection_invoices(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_collection_invoices(jsonb) TO authenticated;

