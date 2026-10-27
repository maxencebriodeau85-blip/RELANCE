-- Factures d'exemple : essayer Encair sans fichier sous la main.
-- Cinq factures fictives, marquées is_sample, qui ne consomment pas le quota,
-- ne déclenchent ni relance ni notification, et se suppriment en un clic.
alter table public.invoices add column if not exists is_sample boolean not null default false;
create index if not exists invoices_user_sample_idx on public.invoices (user_id) where is_sample;

-- Attribution, date de création et marque « exemple » figées après création.
-- Un exemple ne peut naître que de create_sample_invoices(), qui pose le
-- réglage de session encair.creating_samples le temps de son insertion :
-- ni l'API, ni l'import, ni un appel direct à la table ne peuvent en créer,
-- et une vraie facture ne peut pas devenir un exemple pour libérer du quota.
create or replace function public.protect_invoice_attribution() returns trigger
language plpgsql set search_path = public as $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.created_at := now();
  IF NEW.is_sample AND coalesce(current_setting('encair.creating_samples', true), '') <> 'on' THEN
   RAISE EXCEPTION 'Les factures d’exemple se créent depuis le tableau de bord.' USING ERRCODE='42501';
  END IF;
 ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.is_sample IS DISTINCT FROM OLD.is_sample THEN
  RAISE EXCEPTION 'Attribution et date de création non modifiables' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;

-- Quota : même règle qu'en production, mais les exemples ne comptent pas.
create or replace function public.enforce_invoice_quota() returns trigger
language plpgsql security definer set search_path = public as $$
DECLARE v_plan text; v_trial timestamptz; v_limit int; v_count int;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('invoice_quota:' || new.user_id::text));
 SELECT plan,trial_ends_at INTO v_plan,v_trial FROM profiles WHERE id = new.user_id;
 IF NOT FOUND OR (v_plan='free_trial' AND (v_trial IS NULL OR v_trial <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE='42501'; END IF;
 IF new.is_sample THEN RETURN new; END IF;
 v_limit := CASE coalesce(v_plan,'free_trial') WHEN 'starter' THEN 100 WHEN 'pro' THEN 200 WHEN 'business' THEN 1000 ELSE 10 END;
 SELECT count(*) INTO v_count FROM invoices WHERE user_id = new.user_id AND NOT is_sample AND created_at >= date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF v_count >= v_limit THEN RAISE EXCEPTION 'Limite mensuelle de % nouvelles factures atteinte.', v_limit USING ERRCODE = '23514'; END IF;
 RETURN new;
END $$;
revoke execute on function public.enforce_invoice_quota() from public, anon, authenticated;

-- Aucune relance, même manuelle, sur un exemple (les adresses sont en .invalid).
create or replace function public.claim_collection_reminder(p_invoice_id uuid, p_user_id uuid, p_type text, p_subject text, p_content text)
returns uuid language plpgsql security definer set search_path = public as $$
DECLARE claim_id uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('reminder:' || p_invoice_id::text));
 IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = p_invoice_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
 IF EXISTS (SELECT 1 FROM invoices WHERE id = p_invoice_id AND is_sample) THEN
  RAISE EXCEPTION 'Facture d’exemple : aucune relance n’est envoyée.' USING ERRCODE='42501';
 END IF;
 IF p_type NOT IN ('email_1','email_2','email_3') THEN RAISE EXCEPTION 'Étape invalide'; END IF;
 IF EXISTS (SELECT 1 FROM reminders WHERE invoice_id=p_invoice_id AND status <> 'failed' AND (created_at >= now()-interval '24 hours' OR status='pending')) THEN
  RAISE EXCEPTION 'Une relance est déjà en cours ou récente' USING ERRCODE='23505';
 END IF;
 INSERT INTO reminders(invoice_id,user_id,type,channel,status,subject,content)
 VALUES(p_invoice_id,p_user_id,p_type,'email','pending',p_subject,p_content) RETURNING id INTO claim_id;
 RETURN claim_id;
END $$;
revoke all on function public.claim_collection_reminder(uuid,uuid,text,text,text) from public, authenticated, anon;
grant execute on function public.claim_collection_reminder(uuid,uuid,text,text,text) to service_role;

-- Pas de notification « facture à vérifier » sur un exemple.
create or replace function public.generate_collection_notifications(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  generated integer;
  today date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_user_id is null then
    raise exception 'Account required' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('collection-notifications:' || p_user_id::text, 0));
  insert into public.notifications(user_id, type, title, body, action_url)
  select i.user_id, 'invoice_overdue', 'Facture ' || i.invoice_number || ' à vérifier',
    i.client_name || ' — reste à payer enregistré : ' || round(i.amount - coalesce(i.amount_paid, 0), 2)::text || ' EUR. Plus de 30 jours de retard. Vérifiez les règlements et le suivi avant toute relance.',
    '/dashboard/invoices/' || i.id::text
  from public.invoices i
  where i.user_id = p_user_id
    and not i.is_sample
    and i.status in ('pending', 'reminded', 'formal_notice')
    and i.amount > coalesce(i.amount_paid, 0)
    and i.due_date < today - 30
    and (i.promise_date is null or i.promise_date < today)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id and n.type = 'invoice_overdue'
        and n.action_url = '/dashboard/invoices/' || i.id::text
        and n.created_at >= now() - interval '7 days'
    )
  order by i.due_date, i.id
  limit 100;
  get diagnostics generated = row_count;
  return jsonb_build_object('created', generated, 'limit', 100);
end;
$$;
revoke all on function public.generate_collection_notifications(uuid) from public, anon, authenticated;
grant execute on function public.generate_collection_notifications(uuid) to service_role;

-- Cinq exemples, une seule fois et seulement dans un espace vide. Exécutée
-- avec les droits du client (RLS appliquée) : pas d'élévation de privilèges.
create or replace function public.create_sample_invoices() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  today date := (now() at time zone 'Europe/Paris')::date;
begin
  if uid is null then raise exception 'Authentification requise' using errcode = '42501'; end if;
  select * into p from public.profiles where id = uid;
  if not found or (p.plan = 'free_trial' and (p.trial_ends_at is null or p.trial_ends_at <= now())) then
    raise exception 'Abonnement ou essai actif requis' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('invoice_quota:' || uid::text));
  if exists (select 1 from public.invoices where user_id = uid) then
    raise exception 'Les exemples ne s’ajoutent qu’à un espace vide.' using errcode = '23514';
  end if;
  perform pg_catalog.set_config('encair.creating_samples', 'on', true);
  insert into public.invoices(user_id, invoice_number, client_name, client_email, amount, amount_paid,
    issued_date, due_date, status, promise_date, balance_checked_at, reminders_paused, is_sample) values
    (uid, 'EXEMPLE-1', 'Bureau d’études Martin (exemple)', 'compta@martin.exemple.invalid', 2869.66, 506.51, today - 68, today - 38, 'pending', null, now(), false, true),
    (uid, 'EXEMPLE-2', 'Menuiserie Roy (exemple)', 'factures@roy.exemple.invalid', 1200, 0, today - 42, today - 12, 'pending', today + 5, now(), true, true),
    (uid, 'EXEMPLE-3', 'SCI Atlantique (exemple)', 'gestion@atlantique.exemple.invalid', 640, 0, today - 80, today - 50, 'disputed', null, now(), true, true),
    (uid, 'EXEMPLE-4', 'Garage Dupuis (exemple)', null, 980, 0, today - 20, today + 10, 'pending', null, null, true, true),
    (uid, 'EXEMPLE-5', 'Studio Rivage (exemple)', 'compta@rivage.exemple.invalid', 1500, 1500, today - 50, today - 20, 'paid', null, now(), true, true);
  perform pg_catalog.set_config('encair.creating_samples', '', true);
  return jsonb_build_object('created', 5);
end $$;
revoke all on function public.create_sample_invoices() from public, anon;
grant execute on function public.create_sample_invoices() to authenticated;
