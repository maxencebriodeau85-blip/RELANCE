-- Actions groupées « Activer les relances » et « Mettre en pause ».
-- Retour des clients test : la pause se levait facture par facture (30 à 40
-- clics), et une facture absente d'un réimport devait pouvoir être mise en
-- pause d'un coup, sans risquer une relance chez un client qui a payé.
--
-- activate : lève la pause et confirme le solde à l'instant (l'écran demande
--   au client d'attester que les soldes affichés sont à jour). Les factures
--   réglées, en litige, d'exemple ou sans email valide restent en pause et
--   sont comptées dans « skipped ».
-- pause : met les relances en pause, sans toucher au solde ni au statut.
CREATE OR REPLACE FUNCTION public.apply_invoice_action(items jsonb, action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); item jsonb; inv public.invoices%ROWTYPE; p public.profiles%ROWTYPE; affected int := 0; skipped int := 0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=uid;
 IF NOT FOUND OR p.plan NOT IN ('free_trial','starter','pro','business') OR (p.plan='free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at<=now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE='42501'; END IF;
 IF action IS NULL OR action NOT IN ('paid','disputed','delete','activate','pause') OR items IS NULL OR jsonb_typeof(items)<>'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Action invalide, 100 factures maximum' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(items)) <> jsonb_array_length(items) THEN RAISE EXCEPTION 'Sélection invalide' USING ERRCODE='22023'; END IF;
 -- Match the import/quota lock first, then lock rows in a stable order.
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || uid::text));
 FOR item IN SELECT value FROM jsonb_array_elements(items) ORDER BY value->>'id' LOOP
  SELECT * INTO inv FROM public.invoices WHERE id=(item->>'id')::uuid AND user_id=uid FOR UPDATE;
  IF NOT FOUND OR item->>'updated_at' IS NULL OR inv.updated_at IS DISTINCT FROM (item->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'Une facture a changé. Rechargez la liste.' USING ERRCODE='40001'; END IF;
  IF action='delete' THEN DELETE FROM public.invoices WHERE id=inv.id AND user_id=uid;
  ELSIF action='paid' THEN UPDATE public.invoices SET status='paid',amount_paid=amount,reminders_paused=true,balance_checked_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  ELSIF action='pause' THEN UPDATE public.invoices SET reminders_paused=true,updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  ELSIF action='activate' THEN
   IF inv.status IN ('paid','disputed') OR inv.is_sample
      OR coalesce(inv.amount_paid,0) >= inv.amount
      OR nullif(btrim(inv.client_email),'') IS NULL
      OR lower(btrim(inv.client_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    skipped := skipped + 1;
    CONTINUE;
   END IF;
   UPDATE public.invoices SET reminders_paused=false,balance_checked_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  ELSE
   IF inv.status='paid' THEN RAISE EXCEPTION 'Une facture réglée ne peut pas être mise en litige sans corriger le solde.' USING ERRCODE='22023'; END IF;
   UPDATE public.invoices SET status='disputed',reminders_paused=true,updated_at=clock_timestamp() WHERE id=inv.id AND user_id=uid;
  END IF;
  affected:=affected+1;
 END LOOP;
 RETURN jsonb_build_object('affected',affected,'skipped',skipped);
END $$;
