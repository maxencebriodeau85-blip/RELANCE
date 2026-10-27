-- Recette de la base Encair : 54 contrôles du parcours client, des traitements serveur,
-- de la suppression d'un compte et des factures d'exemple.
--
-- À lancer sur la base de RECETTE (encair-test) : Supabase > SQL Editor > Run,
-- ou via l'outil execute_sql. Chaque bloc crée des comptes fictifs (@encair.test),
-- exécute les contrôles en se faisant passer pour ces comptes exactement comme
-- PostgREST (rôle `authenticated` + `request.jwt.claims`), puis termine par
-- RAISE EXCEPTION : tout est annulé, rien ne reste en base.
--
-- Le résultat s'affiche donc comme une « erreur » commençant par RECETTE.
-- Chaque ligne commence par OK ou KO. Une seule ligne KO bloque le lancement.
-- Ne couvre pas : envoi réel Resend, Stripe, interface, routes HTTP (voir
-- COMMERCIAL_LAUNCH.md). Dernière exécution complète : 27 octobre 2026, 54/54 OK.

-- ===== Bloc 1 : parcours client, isolement entre comptes, essai expiré (01-29)
DO $recette$
DECLARE
 a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
 r text := E'\n'; n int; j jsonb; v numeric; inv record;
 id1 uuid; id2 uuid; id3 uuid; id4 uuid; u2 timestamptz; u4 timestamptz;
 claims_a text; claims_b text;
BEGIN
 claims_a := json_build_object('sub',a,'role','authenticated')::text;
 claims_b := json_build_object('sub',b,'role','authenticated')::text;
 insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','recette-a@encair.test',now(),'{"company_name":"Recette A","terms_version":"2026-10-18","professional_use":"true"}','{"provider":"email","providers":["email"]}',now(),now()),
  (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','recette-b@encair.test',now(),'{"company_name":"Recette B","terms_version":"2026-10-18","professional_use":"true"}','{"provider":"email","providers":["email"]}',now(),now());

 select count(*) into n from public.profiles where id in (a,b) and plan='free_trial' and trial_ends_at between now()+interval '29 days' and now()+interval '31 days' and signup_terms_version='2026-10-18' and signup_professional_use and company_name like 'Recette%';
 r := r || case when n=2 then 'OK ' else 'KO ' end || '01 Inscription : profil créé, essai 30 j, CGU et usage pro tracés' || E'\n';

 perform set_config('request.jwt.claims', claims_a, true);
 perform set_config('role','authenticated',true);
 j := public.import_collection_invoices('[
  {"invoice_number":"F-001","client_name":"Bureau Martin","client_email":"Compta@Martin.test","amount":2869.66,"remaining_amount":2363.15,"due_date":"2026-08-28","issued_date":"2026-07-29"},
  {"invoice_number":"F-002","client_name":"Menuiserie Roy","client_email":"roy@menuiserie.test","amount":1200,"due_date":"2026-10-17"},
  {"invoice_number":"F-003","client_name":"SCI Atlantique","client_email":"gestion@sci.test","amount":500,"remaining_amount":0,"due_date":"2026-09-30"},
  {"invoice_number":" F-004 ","client_name":"Garage Dupuis","amount":800,"due_date":"2026-09-15"}]'::jsonb);
 r := r || case when j->>'imported'='4' then 'OK ' else 'KO ' end || '02 Import CSV : 4 factures importées (' || j::text || ')' || E'\n';
 select count(*) into n from public.invoices where reminders_paused;
 r := r || case when n=4 then 'OK ' else 'KO ' end || '03 Toute facture importée est en pause (' || n || '/4)' || E'\n';
 select * into inv from public.invoices where invoice_number='F-001'; id1 := inv.id;
 r := r || case when inv.amount_paid=506.51 and inv.client_email='compta@martin.test' and inv.balance_checked_at is not null then 'OK ' else 'KO ' end || '04 Paiement partiel : 2869,66 − 2363,15 → déjà payé ' || inv.amount_paid || ' €, email normalisé' || E'\n';
 select * into inv from public.invoices where invoice_number='F-002'; id2 := inv.id;
 r := r || case when inv.balance_checked_at is null and inv.issued_date is null then 'OK ' else 'KO ' end || '05 Solde non fourni : non vérifié, date d’émission non inventée' || E'\n';
 select * into inv from public.invoices where invoice_number='F-003'; id3 := inv.id;
 r := r || case when inv.status='paid' and inv.paid_at is not null then 'OK ' else 'KO ' end || '06 Reste à payer 0 : facture soldée' || E'\n';
 select * into inv from public.invoices where invoice_number='F-004'; id4 := inv.id;
 r := r || case when inv.client_email is null then 'OK ' else 'KO ' end || '07 Email absent : stocké vide, rien d’inventé ; référence nettoyée (' || inv.invoice_number || ')' || E'\n';

 j := public.import_collection_invoices('[{"invoice_number":"F-001","client_name":"Bureau Martin","client_email":"compta@martin.test","amount":2869.66,"remaining_amount":2000,"due_date":"2026-08-28"}]'::jsonb);
 select amount_paid into v from public.invoices where id=id1;
 r := r || case when j->>'updated'='1' and j->>'imported'='0' and v=869.66 then 'OK ' else 'KO ' end || '08 Réimport : solde actualisé sans doublon (déjà payé ' || v || ' €)' || E'\n';
 perform set_config('role','postgres',true);
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices('[{"invoice_number":"F-9","client_name":"X","amount":10,"due_date":"2026-10-01"},{"invoice_number":"F-9","client_name":"X","amount":10,"due_date":"2026-10-01"}]'::jsonb);
  r := r || 'KO 09 Référence en double dans le fichier acceptée' || E'\n';
 exception when others then r := r || case when sqlerrm like 'Référence répétée%' then 'OK ' else 'KO ' end || '09 Référence en double dans le fichier refusée (' || sqlerrm || ')' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices('[{"invoice_number":"F-001","client_name":"Bureau Martin","client_email":"compta@martin.test","amount":3000,"due_date":"2026-08-28"}]'::jsonb);
  r := r || 'KO 10 Montant contradictoire accepté' || E'\n';
 exception when others then r := r || case when sqlerrm like '%autre montant%' then 'OK ' else 'KO ' end || '10 Même référence avec un autre montant refusée' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices('[{"invoice_number":"F-NEG","client_name":"X","amount":-50,"due_date":"2026-10-01"}]'::jsonb);
  r := r || 'KO 11 Montant négatif accepté' || E'\n';
 exception when others then r := r || 'OK 11 Montant négatif refusé (' || sqlerrm || ')' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices('[{"invoice_number":"F-002","client_name":"Menuiserie Roy","client_email":"roy@menuiserie.test","amount":1200,"remaining_amount":600,"due_date":"2026-10-17","expected_updated_at":"2001-01-01T00:00:00Z"}]'::jsonb);
  r := r || 'KO 12 Aperçu périmé accepté' || E'\n';
 exception when others then r := r || case when sqlstate='40001' then 'OK ' else 'KO ' end || '12 Facture modifiée depuis l’aperçu : import refusé' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices((select jsonb_agg(jsonb_build_object('invoice_number','Q-'||g,'client_name','Quota','amount',100,'due_date','2026-10-01')) from generate_series(1,7) g));
  r := r || 'KO 13 Quota d’essai dépassé (11 factures)' || E'\n';
 exception when others then r := r || case when sqlerrm like 'Limite mensuelle de 10%' then 'OK ' else 'KO ' end || '13 Quota d’essai : la 11e facture bloque tout l’import (' || sqlerrm || ')' || E'\n'; end;
 perform set_config('role','authenticated',true);
 select count(*) into n from public.invoices;
 r := r || case when n=4 then 'OK ' else 'KO ' end || '14 Import refusé = rien d’enregistré (' || n || ' factures)' || E'\n';

 update public.invoices set reminders_paused=false, balance_checked_at=now() where id=id1; get diagnostics n = row_count;
 r := r || case when n=1 then 'OK ' else 'KO ' end || '15 Le client confirme le solde et lève la pause' || E'\n';
 select updated_at into u2 from public.invoices where id=id2;
 j := public.apply_invoice_action(jsonb_build_array(jsonb_build_object('id',id2,'updated_at',u2)),'paid');
 select updated_at into u4 from public.invoices where id=id4;
 j := public.apply_invoice_action(jsonb_build_array(jsonb_build_object('id',id4,'updated_at',u4)),'disputed');
 select count(*) into n from public.invoices where (id=id2 and status='paid' and reminders_paused) or (id=id4 and status='disputed' and reminders_paused);
 r := r || case when n=2 then 'OK ' else 'KO ' end || '16 Payée et litige : relances suspendues' || E'\n';
 j := public.collection_overview();
 r := r || case when (j->>'outstanding')::numeric=2800 and (j->>'disputed')::numeric=800 then 'OK ' else 'KO ' end || '17 Tableau de bord : reste dû ' || (j->>'outstanding') || ' € dont litige ' || (j->>'disputed') || ' €' || E'\n';
 perform set_config('role','postgres',true);
 begin
  perform set_config('role','authenticated',true);
  update public.profiles set plan='starter' where id=a;
  r := r || 'KO 18 Le client a pu s’attribuer un abonnement' || E'\n';
 exception when others then r := r || 'OK 18 Le client ne peut pas s’attribuer un abonnement (' || sqlerrm || ')' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  insert into public.reminders(invoice_id,user_id,type,channel,status) values(id1,a,'email_1','email','sent');
  r := r || 'KO 19 Le client a pu écrire dans l’historique des relances' || E'\n';
 exception when others then r := r || 'OK 19 Historique des relances non falsifiable par le client (' || sqlstate || ')' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.claim_collection_reminder(id1,a,'email_1','s','c');
  r := r || 'KO 20 Le client a pu déclencher une relance serveur' || E'\n';
 exception when others then r := r || 'OK 20 Réservation d’envoi réservée au serveur (' || sqlstate || ')' || E'\n'; end;

 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claims', claims_b, true);
 perform set_config('role','authenticated',true);
 select count(*) into n from public.invoices;
 r := r || case when n=0 then 'OK ' else 'KO ' end || '21 Compte B ne voit aucune facture de A (' || n || ')' || E'\n';
 update public.invoices set amount_paid=0, reminders_paused=false where id in (id1,id2,id3,id4); get diagnostics n = row_count;
 r := r || case when n=0 then 'OK ' else 'KO ' end || '22 Compte B ne peut modifier aucune facture de A' || E'\n';
 j := public.collection_overview();
 r := r || case when (j->>'outstanding')::numeric=0 and (j->>'invoice_count')::int=0 then 'OK ' else 'KO ' end || '23 Tableau de bord de B vide' || E'\n';
 select count(*) into n from public.profiles where id=a;
 r := r || case when n=0 then 'OK ' else 'KO ' end || '24 Compte B ne lit pas le profil de A' || E'\n';
 perform set_config('role','postgres',true);
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices_for_owner(a,'[{"invoice_number":"PIRATE","client_name":"X","amount":10,"due_date":"2026-10-01"}]'::jsonb);
  r := r || 'KO 25 B a importé dans le compte de A' || E'\n';
 exception when others then r := r || case when sqlerrm like 'Compte non autorisé%' then 'OK ' else 'KO ' end || '25 B ne peut pas importer dans le compte de A' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  perform public.apply_invoice_action(jsonb_build_array(jsonb_build_object('id',id1,'updated_at',now())),'paid');
  r := r || 'KO 26 B a modifié une facture de A par action groupée' || E'\n';
 exception when others then r := r || 'OK 26 Action groupée de B sur une facture de A refusée' || E'\n'; end;

 perform set_config('request.jwt.claims', '', true);
 begin
  perform set_config('role','anon',true);
  select count(*) into n from public.invoices;
  r := r || case when n=0 then 'OK ' else 'KO ' end || '27 Visiteur non connecté : aucune facture visible (' || n || ')' || E'\n';
 exception when others then r := r || 'OK 27 Visiteur non connecté : accès refusé (' || sqlstate || ')' || E'\n'; end;

 perform set_config('role','postgres',true);
 update public.profiles set trial_ends_at=now()-interval '1 day' where id=a;
 perform set_config('request.jwt.claims', claims_a, true);
 begin
  perform set_config('role','authenticated',true);
  perform public.import_collection_invoices('[{"invoice_number":"F-EXP","client_name":"X","amount":10,"due_date":"2026-10-01"}]'::jsonb);
  r := r || 'KO 28 Import accepté après fin d’essai' || E'\n';
 exception when others then r := r || case when sqlerrm like 'Abonnement ou essai actif requis%' then 'OK ' else 'KO ' end || '28 Essai expiré : import bloqué' || E'\n'; end;
 perform set_config('role','authenticated',true);
 select count(*) into n from public.invoices;
 r := r || case when n=4 then 'OK ' else 'KO ' end || '29 Essai expiré : factures toujours consultables, aucune perte (' || n || ')' || E'\n';
 perform set_config('role','postgres',true);

 RAISE EXCEPTION 'RECETTE (tout est annulé)%', r;
END
$recette$;

-- ===== Bloc 2 : traitement quotidien, double envoi, Resend, notifications (30-41)
DO $recette2$
DECLARE
 a uuid := gen_random_uuid(); r text := E'\n'; n int; j jsonb; lease uuid; c1 uuid; c2 uuid; id1 uuid; ok boolean; w record;
BEGIN
 insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','recette-c@encair.test',now(),'{"company_name":"Recette C"}',now(),now());
 insert into public.invoices(user_id,client_name,client_email,invoice_number,amount,amount_paid,due_date,balance_checked_at,reminders_paused,status)
  values(a,'Bureau Martin','compta@martin.test','F-100',1500,400,current_date-45,now(),false,'pending') returning id into id1;

 perform set_config('role','service_role',true);
 perform public.record_collection_worker_attempt('automation_not_configured');
 select * into w from public.collection_worker where name='reminders';
 r := r || case when w.last_blocked_reason='automation_not_configured' and w.last_attempt_at is not null then 'OK ' else 'KO ' end || '30 Passage bloqué tracé (configuration manquante)' || E'\n';
 j := public.claim_collection_worker(); lease := (j->>'lease_id')::uuid;
 select * into w from public.collection_worker where name='reminders';
 r := r || case when lease is not null and w.last_blocked_reason is null then 'OK ' else 'KO ' end || '31 Le traitement quotidien prend la main et efface l’alerte' || E'\n';
 j := public.claim_collection_worker();
 r := r || case when j is null then 'OK ' else 'KO ' end || '32 Second déclenchement simultané refusé (pas de double passage)' || E'\n';
 ok := public.finish_collection_worker(gen_random_uuid(), null, '{"ok":true,"sent":0}');
 r := r || case when not ok then 'OK ' else 'KO ' end || '33 Un passage périmé ne peut pas clore celui en cours' || E'\n';
 ok := public.finish_collection_worker(lease, null, '{"ok":true,"sent":1}');
 select * into w from public.collection_worker where name='reminders';
 r := r || case when ok and w.completed_at is not null and (w.last_result->>'ok')::boolean then 'OK ' else 'KO ' end || '34 Fin de passage enregistrée (suivi /api/cron/status)' || E'\n';

 c1 := public.claim_collection_reminder(id1,a,'email_1','Relance F-100','Reste dû 1 100,00 €');
 begin
  c2 := public.claim_collection_reminder(id1,a,'email_2','Relance F-100','x');
  r := r || 'KO 35 Deuxième relance acceptée pendant qu’une autre est en cours' || E'\n';
 exception when others then r := r || case when sqlstate='23505' then 'OK ' else 'KO ' end || '35 Pas de double envoi : 2e relance refusée tant que la 1re est en cours ou < 24 h' || E'\n'; end;
 update public.reminders set resend_id='re_test_1' where id=c1;
 ok := public.record_collection_email_event('re_test_1','email.delivered',now());
 ok := public.record_collection_email_event('re_test_1','email.sent',now()-interval '1 minute');
 select status into j from (select to_jsonb(status) status from public.reminders where id=c1) s;
 r := r || case when j #>> '{}' = 'delivered' then 'OK ' else 'KO ' end || '36 Événements Resend dans le désordre : le statut ne régresse pas (' || (j #>> '{}') || ')' || E'\n';
 ok := public.record_collection_email_event('re_test_1','email.bounced',now());
 select count(*) into n from public.invoices where id=id1 and reminders_paused;
 r := r || case when n=1 then 'OK ' else 'KO ' end || '37 Rebond d’email : relances de la facture suspendues' || E'\n';
 ok := public.record_collection_email_event('re_inconnu','email.delivered',now());
 r := r || case when not ok then 'OK ' else 'KO ' end || '38 Événement Resend inconnu ignoré sans erreur' || E'\n';

 j := public.generate_collection_notifications(a);
 r := r || case when (j->>'created')::int=1 then 'OK ' else 'KO ' end || '39 Notification « facture à vérifier » créée (+30 j de retard)' || E'\n';
 select body into j from (select to_jsonb(body) body from public.notifications where user_id=a limit 1) s;
 r := r || case when (j #>> '{}') like '%1100.00 EUR%' then 'OK ' else 'KO ' end || '40 La notification affiche le reste dû (1 100 €), pas le montant initial' || E'\n';
 j := public.generate_collection_notifications(a);
 r := r || case when (j->>'created')::int=0 then 'OK ' else 'KO ' end || '41 Pas de notification en double dans les 7 jours' || E'\n';

 perform set_config('role','postgres',true);
 RAISE EXCEPTION 'RECETTE SERVEUR (tout est annulé)%', r;
END
$recette2$;

-- ===== Bloc 3 : suppression d'un compte (RGPD) (S1-S3)
-- Contient une suppression : Supabase demande une confirmation avant de l'exécuter.
DO $suppr$
DECLARE a uuid := gen_random_uuid(); keep uuid := gen_random_uuid(); inv uuid; ct uuid; k uuid; r text := E'\n'; n int; total int := 0; t text;
BEGIN
 insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','supprime-moi@encair.test',now(),'{"company_name":"A supprimer"}',now(),now()),
  (keep,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','reste@encair.test',now(),'{"company_name":"Autre client"}',now(),now());
 insert into public.invoices(user_id,client_name,client_email,invoice_number,amount,due_date) values(a,'Client','c@x.test','S-1',100,current_date) returning id into inv;
 insert into public.invoices(user_id,client_name,client_email,invoice_number,amount,due_date) values(keep,'Client','c@x.test','K-1',100,current_date);
 insert into public.reminders(invoice_id,user_id,type,channel,status) values(inv,a,'email_1','email','sent');
 insert into public.notifications(user_id,type,title,body) values(a,'invoice_overdue','t','b');
 insert into public.email_template_overrides(user_id,template_type,subject,body) values(a,'email_1','s','b');
 insert into public.reminder_scenarios(user_id,name,steps) values(a,'Perso','[]');
 insert into public.import_presets(user_id,name,headers,mapping) values(a,'Format','["a","b","c","d"]','{"client_name":"a","invoice_number":"b","amount":"c","due_date":"d"}');
 insert into public.contacts(user_id,name) values(a,'Contact') returning id into ct;
 insert into public.journal_entries(user_id,contact_id,type,content) values(a,ct,'note','x');
 insert into public.integration_keys(user_id,name,key_hash,key_prefix,scopes) values(a,'Cle',repeat('a',64),'enc_','{invoices:read}') returning id into k;
 insert into public.integration_requests(key_id,request_id,body_hash,response) values(k,'req-00001',repeat('b',64),'{}');
 insert into public.invoice_external_refs(user_id,source,external_id,invoice_id) values(a,'test','e1',inv);

 delete from auth.users where id = a;

 for t in select unnest(array['profiles:id','invoices:user_id','reminders:user_id','notifications:user_id','email_template_overrides:user_id','reminder_scenarios:user_id','import_presets:user_id','contacts:user_id','journal_entries:user_id','contact_sequences:user_id','integration_keys:user_id','invoice_external_refs:user_id','integrations:user_id','api_keys:user_id']) loop
  execute format('select count(*) from public.%I where %I = $1', split_part(t,':',1), split_part(t,':',2)) into n using a;
  total := total + n;
  if n > 0 then r := r || 'KO reste ' || n || ' ligne(s) dans ' || split_part(t,':',1) || E'\n'; end if;
 end loop;
 select count(*) into n from public.integration_requests where key_id = k; total := total + n;
 r := r || case when total = 0 then 'OK ' else 'KO ' end || 'S1 Suppression du compte : plus aucune ligne dans les 15 tables du client (' || total || ')' || E'\n';
 select count(*) into n from public.invoices where user_id = keep;
 r := r || case when n = 1 then 'OK ' else 'KO ' end || 'S2 Les données d’un autre client restent intactes' || E'\n';
 select count(*) into n from auth.identities where user_id = a;
 r := r || case when n = 0 then 'OK ' else 'KO ' end || 'S3 Identités de connexion supprimées' || E'\n';
 RAISE EXCEPTION 'RECETTE SUPPRESSION (tout est annulé)%', r;
END
$suppr$;

-- ===== Bloc 4 : factures d'exemple (E1-E10)
DO $exemples$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); r text := E'\n'; n int; j jsonb; id1 uuid;
BEGIN
 insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','exemples@encair.test',now(),'{}',now(),now()),
  (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','autre@encair.test',now(),'{}',now(),now());
 perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
 perform set_config('role','authenticated',true);
 j := public.create_sample_invoices();
 select count(*) into n from public.invoices where is_sample;
 r := r || case when n=5 then 'OK ' else 'KO ' end || 'E1 Cinq exemples créés par le client (sous RLS)' || E'\n';
 j := public.collection_overview();
 r := r || case when (j->>'invoice_count')::int=5 and (j->>'outstanding')::numeric>0 then 'OK ' else 'KO ' end || 'E2 Tableau de bord rempli : reste dû ' || (j->>'outstanding') || ' €, litige ' || (j->>'disputed') || ' €, promesses ' || (j->>'promise_count') || E'\n';
 j := public.import_collection_invoices((select jsonb_agg(jsonb_build_object('invoice_number','R-'||g,'client_name','C','amount',100,'due_date','2026-12-01')) from generate_series(1,10) g));
 r := r || case when (j->>'imported')::int=10 then 'OK ' else 'KO ' end || 'E3 Les exemples ne consomment pas le quota : 10 vraies factures importées' || E'\n';
 perform set_config('role','postgres',true);
 begin
  perform set_config('role','authenticated',true);
  insert into public.invoices(user_id,client_name,invoice_number,amount,due_date,is_sample) values(a,'X','HACK',10,'2026-12-01',true);
  r := r || 'KO E4 Le client a fabriqué un exemple hors quota' || E'\n';
 exception when others then r := r || 'OK E4 Un client ne peut pas fabriquer d’exemple (' || sqlerrm || ')' || E'\n'; end;
 begin
  perform set_config('role','authenticated',true);
  update public.invoices set is_sample=true where invoice_number='R-1';
  r := r || 'KO E5 Vraie facture transformée en exemple' || E'\n';
 exception when others then r := r || 'OK E5 Une vraie facture ne peut pas devenir un exemple' || E'\n'; end;
 select id into id1 from public.invoices where invoice_number='EXEMPLE-1' and user_id=a;
 begin
  perform set_config('role','service_role',true);
  perform public.claim_collection_reminder(id1,a,'email_1','s','c');
  r := r || 'KO E6 Relance réservée sur un exemple' || E'\n';
 exception when others then r := r || case when sqlerrm like 'Facture d’exemple%' then 'OK ' else 'KO ' end || 'E6 Aucune relance serveur sur un exemple' || E'\n'; end;
 perform set_config('role','service_role',true);
 j := public.generate_collection_notifications(a);
 r := r || case when (j->>'created')::int=0 then 'OK ' else 'KO ' end || 'E7 Aucune notification sur les exemples (' || (j->>'created') || ')' || E'\n';
 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
 perform set_config('role','authenticated',true);
 select count(*) into n from public.invoices where is_sample;
 r := r || case when n=0 then 'OK ' else 'KO ' end || 'E8 Un autre compte ne voit pas ces exemples' || E'\n';
 perform set_config('role','postgres',true);
 perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
 perform set_config('role','authenticated',true);
 delete from public.invoices where user_id=a and is_sample;
 select count(*) into n from public.invoices where user_id=a and is_sample;
 r := r || case when n=0 then 'OK ' else 'KO ' end || 'E9 Le client supprime ses exemples' || E'\n';
 select count(*) into n from public.invoices where user_id=a and not is_sample;
 r := r || case when n=10 then 'OK ' else 'KO ' end || 'E10 Ses vraies factures restent intactes (' || n || ')' || E'\n';
 perform set_config('role','postgres',true);
 RAISE EXCEPTION 'RECETTE EXEMPLES (tout est annulé)%', r;
END $exemples$;
