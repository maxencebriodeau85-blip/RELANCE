-- All secrets and operational state are server-only; browser CRUD is forbidden.
create table public.integration_keys (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(name) between 1 and 80), key_hash text not null unique check(key_hash ~ '^[a-f0-9]{64}$'),
 key_prefix text not null, scopes text[] not null check(scopes <@ array['invoices:read','invoices:write']::text[] and cardinality(scopes)>0),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '365 days', revoked_at timestamptz, last_used_at timestamptz
);
create index integration_keys_owner on public.integration_keys(user_id);
create table public.invoice_external_refs (
 user_id uuid not null references public.profiles(id) on delete cascade, source text not null, external_id text not null,
 invoice_id uuid not null references public.invoices(id) on delete cascade,
 primary key(user_id,source,external_id), unique(user_id,source,invoice_id)
);
create index invoice_external_refs_invoice on public.invoice_external_refs(invoice_id);
create table public.integration_requests (
 key_id uuid not null references public.integration_keys(id) on delete cascade, request_id text not null,
 body_hash text not null, response jsonb not null, created_at timestamptz not null default now(), primary key(key_id,request_id)
);
create table public.request_buckets (bucket text primary key, window_start timestamptz not null, hits integer not null);
alter table public.integration_keys enable row level security;
alter table public.invoice_external_refs enable row level security;
alter table public.integration_requests enable row level security;
alter table public.request_buckets enable row level security;
revoke all on public.integration_keys, public.invoice_external_refs, public.integration_requests, public.request_buckets from public,anon,authenticated;
grant all on public.integration_keys, public.invoice_external_refs, public.integration_requests, public.request_buckets to service_role;

create function public.consume_request_bucket(p_bucket text, p_limit integer, p_seconds integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_limit<1 or p_seconds<1 or length(p_bucket)>200 then raise exception 'Invalid bucket'; end if;
 insert into public.request_buckets as b values(p_bucket,now(),1)
 on conflict(bucket) do update set hits=case when b.window_start<=now()-make_interval(secs=>p_seconds) then 1 else b.hits+1 end,
 window_start=case when b.window_start<=now()-make_interval(secs=>p_seconds) then now() else b.window_start end returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_request_bucket(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_bucket(text,integer,integer) to service_role;
CREATE OR REPLACE FUNCTION public.import_collection_invoices_for_owner(uid uuid, rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb; existing public.invoices%ROWTYPE;
 total numeric; remaining numeric; added int := 0; changed int := 0; skipped int := 0; seen text[] := ARRAY[]::text[]; ref text; email_value text; p public.profiles%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' AND uid IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Compte non autorisé' USING ERRCODE='42501'; END IF;
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentification requise' USING ERRCODE = '42501'; END IF;
 SELECT * INTO p FROM profiles WHERE id = uid;
 IF NOT FOUND OR p.plan NOT IN ('free_trial','starter','pro','business') OR (p.plan = 'free_trial' AND (p.trial_ends_at IS NULL OR p.trial_ends_at <= now())) THEN RAISE EXCEPTION 'Abonnement ou essai actif requis' USING ERRCODE = '42501'; END IF;
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
      reminders_paused = CASE WHEN remaining > total - coalesce(amount_paid,0) THEN true ELSE reminders_paused END,
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

revoke all on function public.import_collection_invoices_for_owner(uuid,jsonb) from public,anon;
grant execute on function public.import_collection_invoices_for_owner(uuid,jsonb) to authenticated,service_role;
create or replace function public.import_collection_invoices(rows jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select public.import_collection_invoices_for_owner(auth.uid(),rows); $$;

-- Re-check the key inside each transaction: revocation and writes serialize on its row.
create function public.integration_authorize(p_hash text,p_scope text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare k public.integration_keys%rowtype;
begin
 select * into k from public.integration_keys where key_hash=p_hash for update;
 if not found or k.revoked_at is not null or k.expires_at<=now() then raise exception 'INVALID_KEY' using errcode='28000'; end if;
 if not (p_scope=any(k.scopes)) then raise exception 'SCOPE_REQUIRED' using errcode='42501'; end if;
 update public.integration_keys set last_used_at=now() where id=k.id;
 return k.user_id;
end $$;

create function public.integration_sync(p_hash text,p_request_id text,p_body_hash text,p_source text,p_rows jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid; kid uuid; cached public.integration_requests%rowtype; item jsonb; inv public.invoices%rowtype;
 mapped uuid; result jsonb; output jsonb:='[]'; items jsonb:='[]';
begin
 uid:=public.integration_authorize(p_hash,'invoices:write');
 select id into kid from public.integration_keys where key_hash=p_hash;
 if length(p_request_id) not between 8 and 128 or p_body_hash !~ '^[a-f0-9]{64}$' or length(p_source) not between 1 and 50 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 select * into cached from public.integration_requests where key_id=kid and request_id=p_request_id;
 if found then
  if cached.body_hash<>p_body_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='40001'; end if;
  return cached.response||jsonb_build_object('replayed',true);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('invoice_quota:'||uid::text));
 for item in select value from jsonb_array_elements(p_rows) loop
  if length(item->>'external_id') not between 1 and 100 or not(item?'external_id') or not(item?'expected_updated_at') then raise exception 'EXTERNAL_ID_AND_VERSION_REQUIRED' using errcode='22023'; end if;
  select invoice_id into mapped from public.invoice_external_refs where user_id=uid and source=p_source and external_id=item->>'external_id';
  select * into inv from public.invoices where user_id=uid and btrim(invoice_number)=item->>'invoice_number' for update;
  if inv.id is not null and (inv.client_name is distinct from item->>'client_name' or inv.due_date is distinct from (item->>'due_date')::date) then raise exception 'INVOICE_IDENTITY_CONFLICT' using errcode='40001'; end if;
  if mapped is not null and (inv.id is null or mapped<>inv.id) then raise exception 'EXTERNAL_REFERENCE_CONFLICT' using errcode='40001'; end if;
  items:=items||jsonb_build_array(item-'external_id');
 end loop;
 result:=public.import_collection_invoices_for_owner(uid,items);
 for item in select value from jsonb_array_elements(p_rows) loop
  select * into inv from public.invoices where user_id=uid and btrim(invoice_number)=item->>'invoice_number';
  insert into public.invoice_external_refs values(uid,p_source,item->>'external_id',inv.id) on conflict(user_id,source,external_id) do nothing;
  output:=output||jsonb_build_array(jsonb_build_object('id',inv.id,'external_id',item->>'external_id','invoice_number',inv.invoice_number,'updated_at',inv.updated_at,'remaining_amount',inv.amount-coalesce(inv.amount_paid,0),'reminders_paused',inv.reminders_paused));
 end loop;
 result:=result||jsonb_build_object('invoices',output,'replayed',false);
 insert into public.integration_requests values(kid,p_request_id,p_body_hash,result,now());
 return result;
end $$;

create function public.integration_list(p_hash text,p_after uuid default null,p_limit integer default 50) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid; result jsonb;
begin
 uid:=public.integration_authorize(p_hash,'invoices:read');
 if p_limit not between 1 and 100 then raise exception 'INVALID_LIMIT' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.id),'[]') into result from (
 select i.id,i.invoice_number,i.client_name,i.client_email,i.amount,i.amount-coalesce(i.amount_paid,0) as remaining_amount,i.due_date,i.issued_date,i.status,i.reminders_paused,i.updated_at,
 coalesce((select jsonb_agg(jsonb_build_object('source',r.source,'external_id',r.external_id)) from public.invoice_external_refs r where r.user_id=uid and r.invoice_id=i.id),'[]') as external_references
 from public.invoices i where i.user_id=uid and (p_after is null or i.id>p_after) order by i.id limit p_limit+1) q;
 return jsonb_build_object('invoices',result);
end $$;
revoke all on function public.integration_authorize(text,text),public.integration_sync(text,text,text,text,jsonb),public.integration_list(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.integration_authorize(text,text),public.integration_sync(text,text,text,text,jsonb),public.integration_list(text,uuid,integer) to service_role;
-- Explicit server-only policies document the intended access model for advisors.
create policy server_only on public.integration_keys to service_role using(true) with check(true);
create policy server_only on public.invoice_external_refs to service_role using(true) with check(true);
create policy server_only on public.integration_requests to service_role using(true) with check(true);
create policy server_only on public.request_buckets to service_role using(true) with check(true);
