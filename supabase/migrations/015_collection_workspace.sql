-- Additive migration: preserves invoices, old plans and existing subscriptions.
BEGIN;
ALTER TABLE public.invoices ALTER COLUMN issued_date DROP NOT NULL;
-- Definer context made current_user the owner and bypassed the old guard.
ALTER FUNCTION public.protect_profile_billing_columns() SECURITY INVOKER;
ALTER TABLE public.invoices
 ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS paid_at timestamptz,
 ADD COLUMN IF NOT EXISTS balance_checked_at timestamptz,
 ADD COLUMN IF NOT EXISTS promise_date date,
 ADD COLUMN IF NOT EXISTS reminders_paused boolean NOT NULL DEFAULT true;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_amount_paid_range CHECK (amount_paid >= 0 AND amount_paid <= amount);
UPDATE public.invoices SET amount_paid = amount WHERE status = 'paid';
-- Do not invent a historical payment date from updated_at.
CREATE OR REPLACE FUNCTION public.sync_collection_state() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status = 'paid' THEN
   NEW.amount_paid := NEW.amount;
   IF TG_OP = 'INSERT' THEN NEW.paid_at := coalesce(NEW.paid_at, now());
   ELSIF OLD.status <> 'paid' THEN NEW.paid_at := coalesce(NEW.paid_at, now()); END IF;
   NEW.reminders_paused := true;
 ELSIF NEW.amount_paid = NEW.amount THEN
   NEW.status := 'paid'; NEW.paid_at := coalesce(NEW.paid_at, now()); NEW.reminders_paused := true;
 ELSE NEW.paid_at := null;
 END IF;
 IF NEW.status = 'disputed' THEN NEW.reminders_paused := true; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_collection_state BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.sync_collection_state();

-- Delivered/opened/clicked must keep the claim; an email event must never
-- release the slot and cause a second delivery of the same scenario step.
DROP INDEX IF EXISTS public.reminders_invoice_type_active_idx;
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE public.reminders ADD CONSTRAINT reminders_status_check CHECK (status IN ('pending','sent','delivered','opened','clicked','failed','bounced','complained'));
-- Preserve historical records, deduplicate only future delivery claims.
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS delivery_claim boolean NOT NULL DEFAULT true;
WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY invoice_id,type ORDER BY created_at,id) AS n
 FROM public.reminders WHERE status <> 'failed'
)
UPDATE public.reminders SET delivery_claim = false FROM ranked WHERE reminders.id = ranked.id AND ranked.n > 1;
CREATE UNIQUE INDEX reminders_invoice_type_active_idx ON public.reminders(invoice_id,type) WHERE status <> 'failed' AND delivery_claim;

CREATE OR REPLACE FUNCTION public.enforce_invoice_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan text; v_trial timestamptz; v_limit int; v_count int;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || new.user_id::text));
 SELECT plan,trial_ends_at INTO v_plan,v_trial FROM profiles WHERE id = new.user_id;
 IF NOT FOUND OR (v_plan='free_trial' AND (v_trial IS NULL OR v_trial <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE='42501'; END IF;
 v_limit := CASE coalesce(v_plan,'free_trial') WHEN 'starter' THEN 100 WHEN 'pro' THEN 200 WHEN 'business' THEN 1000 ELSE 10 END;
 SELECT count(*) INTO v_count FROM invoices WHERE user_id = new.user_id AND created_at >= date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF v_count >= v_limit THEN RAISE EXCEPTION 'Limite mensuelle de % nouvelles factures atteinte.', v_limit USING ERRCODE = '23514'; END IF;
 RETURN new;
END $$;

-- One atomic import. Existing references update balances only when supplied;
-- they never reset collection history, pauses or disputes.
CREATE OR REPLACE FUNCTION public.import_collection_invoices(rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); item jsonb; existing public.invoices%ROWTYPE;
 total numeric; remaining numeric; added int := 0; changed int := 0; p public.profiles%ROWTYPE;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM profiles WHERE id = uid;
 IF NOT FOUND OR (p.plan = 'free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE = '42501'; END IF;
 IF jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows) < 1 OR jsonb_array_length(rows) > 500 THEN RAISE EXCEPTION 'Import invalide' USING ERRCODE = '22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(rows) LOOP
  total := (item->>'amount')::numeric;
  remaining := coalesce((item->>'remaining_amount')::numeric,total);
  IF total <= 0 OR total > 10000000 OR remaining < 0 OR remaining > total OR length(trim(item->>'invoice_number')) NOT BETWEEN 1 AND 50 OR length(trim(item->>'client_name')) NOT BETWEEN 1 AND 200 OR coalesce(item->>'client_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Ligne invalide' USING ERRCODE = '22023'; END IF;
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
REVOKE ALL ON FUNCTION public.import_collection_invoices(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_collection_invoices(jsonb) TO authenticated;
-- Serialize all reminder types for an invoice, including simultaneous cron/manual sends.
CREATE OR REPLACE FUNCTION public.claim_collection_reminder(p_invoice_id uuid, p_user_id uuid, p_type text, p_subject text, p_content text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claim_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('reminder:' || p_invoice_id::text));
 IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = p_invoice_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
 IF p_type NOT IN ('email_1','email_2','email_3') THEN RAISE EXCEPTION 'Étape invalide'; END IF;
 IF EXISTS (SELECT 1 FROM reminders WHERE invoice_id=p_invoice_id AND status <> 'failed' AND (created_at >= now()-interval '24 hours' OR status='pending')) THEN
  RAISE EXCEPTION 'Une relance est déjà en cours ou récente' USING ERRCODE='23505';
 END IF;
 INSERT INTO reminders(invoice_id,user_id,type,channel,status,subject,content)
 VALUES(p_invoice_id,p_user_id,p_type,'email','pending',p_subject,p_content) RETURNING id INTO claim_id;
 RETURN claim_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_collection_reminder(uuid,uuid,text,text,text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_collection_reminder(uuid,uuid,text,text,text) TO service_role;
-- Keep quota attribution stable, including direct authenticated API writes.
CREATE OR REPLACE FUNCTION public.protect_invoice_attribution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN NEW.created_at := now();
 ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'Attribution et date de création non modifiables' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_protect_invoice_attribution BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.protect_invoice_attribution();
-- Profiles are created by the trusted auth trigger, never by client-selected billing values.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT TO authenticated
 WITH CHECK (auth.uid()=user_id AND EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id=invoice_id AND invoices.user_id=auth.uid()));
COMMIT;
