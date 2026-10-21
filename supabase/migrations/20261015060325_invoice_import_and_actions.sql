-- Reject duplicate historical references before creating the index; never delete user data.
CREATE UNIQUE INDEX invoices_owner_reference_unique ON public.invoices(user_id, btrim(invoice_number));

-- Reconcile the live import with the tested source and honor caller RLS.
-- [.] avoids double-escaped backslashes when SQL is pasted or transported.
CREATE OR REPLACE FUNCTION public.import_collection_invoices(rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); item jsonb; existing public.invoices%ROWTYPE;
 total numeric; remaining numeric; added int := 0; changed int := 0; skipped int := 0; seen text[] := ARRAY[]::text[]; ref text; p public.profiles%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM profiles WHERE id = uid;
 IF NOT FOUND OR (p.plan = 'free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE = '42501'; END IF;
 IF rows IS NULL OR jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows) < 1 OR jsonb_array_length(rows) > 500 THEN RAISE EXCEPTION 'Import invalide' USING ERRCODE = '22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
  ref := btrim(item->>'invoice_number');
  IF ref = ANY(seen) THEN RAISE EXCEPTION 'Référence répétée dans le fichier : %', ref USING ERRCODE='22023'; END IF;
  seen := array_append(seen,ref);
  IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'amount') IS DISTINCT FROM 'number' OR (item->>'remaining_amount' IS NOT NULL AND jsonb_typeof(item->'remaining_amount') <> 'number') THEN RAISE EXCEPTION 'Montant invalide' USING ERRCODE='22023'; END IF;
  total := (item->>'amount')::numeric;
  remaining := coalesce((item->>'remaining_amount')::numeric,total);
  IF total IS NULL OR item->>'due_date' IS NULL OR item->>'invoice_number' IS NULL OR item->>'client_name' IS NULL OR total <> round(total,2) OR remaining <> round(remaining,2) OR total <= 0 OR total > 10000000 OR remaining < 0 OR remaining > total OR length(trim(item->>'invoice_number')) NOT BETWEEN 1 AND 50 OR length(trim(item->>'client_name')) NOT BETWEEN 1 AND 200 OR coalesce(item->>'client_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Ligne invalide' USING ERRCODE = '22023'; END IF;
  IF item->>'issued_date' IS NOT NULL AND (item->>'issued_date')::date > (item->>'due_date')::date THEN RAISE EXCEPTION 'Échéance antérieure à l’émission' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM invoices WHERE user_id = uid AND btrim(invoice_number) = ref FOR UPDATE;
  IF FOUND THEN
   IF item ? 'expected_updated_at' AND ((item->>'expected_updated_at') IS NULL OR existing.updated_at IS DISTINCT FROM (item->>'expected_updated_at')::timestamptz) THEN RAISE EXCEPTION 'Facture modifiée depuis l’aperçu' USING ERRCODE='40001'; END IF;
   IF existing.amount <> total OR lower(existing.client_email) <> lower(item->>'client_email') THEN RAISE EXCEPTION 'La référence % existe avec un autre montant ou email. Vérifiez votre fichier.',existing.invoice_number USING ERRCODE = '22023'; END IF;
   IF item ? 'remaining_amount' AND item->>'remaining_amount' IS NOT NULL THEN
    UPDATE invoices SET amount_paid = total - remaining,
      status = CASE WHEN remaining = 0 THEN 'paid' WHEN status = 'paid' THEN 'pending' ELSE status END,
      balance_checked_at = now(), updated_at = now() WHERE id = existing.id;
    changed := changed + 1;
   ELSE skipped := skipped + 1; END IF;
  ELSE
   IF item->>'expected_updated_at' IS NOT NULL THEN RAISE EXCEPTION 'Facture supprimée depuis l’aperçu' USING ERRCODE='40001'; END IF;
   INSERT INTO invoices(user_id,client_name,client_email,invoice_number,amount,amount_paid,due_date,issued_date,client_address,client_siren,balance_checked_at,reminders_paused,status)
    VALUES(uid,item->>'client_name',lower(item->>'client_email'),ref,total,total-remaining,(item->>'due_date')::date,(item->>'issued_date')::date,item->>'client_address',item->>'client_siren',CASE WHEN item->>'remaining_amount' IS NOT NULL THEN now() ELSE null END,true,CASE WHEN remaining=0 THEN 'paid' ELSE 'pending' END);
   added := added + 1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',added,'updated',changed,'unchanged',skipped);
END $$;
REVOKE ALL ON FUNCTION public.import_collection_invoices(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_collection_invoices(jsonb) TO authenticated;

-- All-or-nothing bulk actions, scoped by RLS and the version shown to the user.
CREATE OR REPLACE FUNCTION public.apply_invoice_action(items jsonb, action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); item jsonb; inv public.invoices%ROWTYPE; p public.profiles%ROWTYPE; affected int := 0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=uid;
 IF NOT FOUND OR p.plan NOT IN ('free_trial','starter','pro','business') OR (p.plan='free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at<=now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE='42501'; END IF;
 IF action IS NULL OR action NOT IN ('paid','disputed','delete') OR items IS NULL OR jsonb_typeof(items)<>'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Action invalide, 100 factures maximum' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(items)) <> jsonb_array_length(items) THEN RAISE EXCEPTION 'Sélection invalide' USING ERRCODE='22023'; END IF;
 -- Match the import/quota lock first, then lock rows in a stable order.
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(items) ORDER BY value->>'id' LOOP
  SELECT * INTO inv FROM public.invoices WHERE id=(item->>'id')::uuid AND user_id=uid FOR UPDATE;
  IF NOT FOUND OR item->>'updated_at' IS NULL OR inv.updated_at IS DISTINCT FROM (item->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'Une facture a changé. Rechargez la liste.' USING ERRCODE='40001'; END IF;
  IF action='delete' THEN DELETE FROM public.invoices WHERE id=inv.id AND user_id=uid;
  ELSIF action='paid' THEN UPDATE public.invoices SET status='paid',amount_paid=amount,reminders_paused=true,balance_checked_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  ELSE
   IF inv.status='paid' THEN RAISE EXCEPTION 'Une facture réglée ne peut pas être mise en litige sans corriger le solde.' USING ERRCODE='22023'; END IF;
   UPDATE public.invoices SET status='disputed',reminders_paused=true,updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  END IF;
  affected:=affected+1;
 END LOOP;
 RETURN jsonb_build_object('affected',affected);
END $$;
REVOKE ALL ON FUNCTION public.apply_invoice_action(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_invoice_action(jsonb,text) TO authenticated;
