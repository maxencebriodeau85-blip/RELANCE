-- Reconcile the live import with the tested source and honor caller RLS.
-- [.] avoids double-escaped backslashes when SQL is pasted or transported.
CREATE OR REPLACE FUNCTION public.import_collection_invoices(rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); item jsonb; existing public.invoices%ROWTYPE;
 total numeric; remaining numeric; added int := 0; changed int := 0; p public.profiles%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM profiles WHERE id = uid;
 IF NOT FOUND OR (p.plan = 'free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE = '42501'; END IF;
 IF rows IS NULL OR jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows) < 1 OR jsonb_array_length(rows) > 500 THEN RAISE EXCEPTION 'Import invalide' USING ERRCODE = '22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
  total := (item->>'amount')::numeric;
  remaining := coalesce((item->>'remaining_amount')::numeric,total);
  IF total IS NULL OR item->>'due_date' IS NULL OR item->>'invoice_number' IS NULL OR item->>'client_name' IS NULL OR total <= 0 OR total > 10000000 OR remaining < 0 OR remaining > total OR length(trim(item->>'invoice_number')) NOT BETWEEN 1 AND 50 OR length(trim(item->>'client_name')) NOT BETWEEN 1 AND 200 OR coalesce(item->>'client_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Ligne invalide' USING ERRCODE = '22023'; END IF;
  SELECT * INTO existing FROM invoices WHERE user_id = uid AND invoice_number = item->>'invoice_number' FOR UPDATE;
  IF FOUND THEN
   IF existing.amount <> total OR lower(existing.client_email) <> lower(item->>'client_email') THEN RAISE EXCEPTION 'La référence % existe avec un autre montant ou email. Vérifiez votre fichier.',existing.invoice_number USING ERRCODE = '22023'; END IF;
   IF item ? 'remaining_amount' AND item->>'remaining_amount' IS NOT NULL THEN
    UPDATE invoices SET amount_paid = total - remaining,
      status = CASE WHEN remaining = 0 THEN 'paid' WHEN status = 'paid' THEN 'pending' ELSE status END,
      balance_checked_at = now(), updated_at = now() WHERE id = existing.id;
    changed := changed + 1;
   END IF;
  ELSE
   INSERT INTO invoices(user_id,client_name,client_email,invoice_number,amount,amount_paid,due_date,issued_date,client_address,client_siren,balance_checked_at,reminders_paused,status)
    VALUES(uid,item->>'client_name',lower(item->>'client_email'),item->>'invoice_number',total,total-remaining,(item->>'due_date')::date,(item->>'issued_date')::date,item->>'client_address',item->>'client_siren',CASE WHEN item->>'remaining_amount' IS NOT NULL THEN now() ELSE null END,true,CASE WHEN remaining=0 THEN 'paid' ELSE 'pending' END);
   added := added + 1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',added,'updated',changed);
END $$;
REVOKE ALL ON FUNCTION public.import_collection_invoices(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_collection_invoices(jsonb) TO authenticated;

ALTER FUNCTION public.protect_invoice_attribution() SET search_path = public;
