-- Contrôles de production lancés chaque heure par .github/workflows/monitor.yml.
-- Chaque ligne renvoyée est un problème « gravité|message ». Aucune ligne = tout va bien.
-- Requêtes en lecture seule. Les tentatives refusées du cron (last_attempt_at,
-- last_blocked_reason) sont contrôlées par GET /api/cron/status, pas ici, pour que
-- ce fichier ne dépende que de colonnes déjà en production.
set statement_timeout = '15s';

-- 1. Passage quotidien des relances : ligne de suivi absente, aucun passage terminé,
--    dernier passage terminé il y a plus de 26 h, ou dernier passage en échec.
--    La jointure gauche depuis (values (1)) produit une ligne même si la ligne de
--    suivi « reminders » a disparu.
select 'critique|Relances automatiques : ' || case
         when w.name is null then
           'ligne de suivi « reminders » absente de public.collection_worker.'
         when w.completed_at is null then
           'aucun passage terminé n''a jamais été enregistré.'
         when w.completed_at < now() - interval '26 hours' then
           'aucun passage terminé depuis '
           || floor(extract(epoch from now() - w.completed_at) / 3600) || ' h (dernier : '
           || to_char(w.completed_at at time zone 'Europe/Paris', 'DD/MM HH24:MI') || ').'
         else
           'le dernier passage (' || to_char(w.completed_at at time zone 'Europe/Paris', 'DD/MM HH24:MI')
           || ') s''est terminé en échec.'
       end
from (values (1)) as probe(one)
left join public.collection_worker w on w.name = 'reminders'
where w.name is null
   or w.completed_at is null
   or w.completed_at < now() - interval '26 hours'
   or (w.last_result ->> 'ok') = 'false'

union all
-- 2. Un passage a commencé mais ne s'est jamais terminé (plantage ou délai dépassé).
select 'critique|Relances automatiques : le passage lancé le '
       || to_char(started_at at time zone 'Europe/Paris', 'DD/MM HH24:MI')
       || ' ne s''est pas terminé.'
from public.collection_worker
where name = 'reminders' and lease_until is not null
  and lease_until < now() - interval '10 minutes'
  and started_at > coalesce(completed_at, '-infinity'::timestamptz)

union all
-- 3. Relances réservées mais jamais envoyées (bloquées entre la réservation et Resend).
select 'critique|' || count(*) || ' relance(s) bloquée(s) en attente d''envoi depuis plus de 15 min.'
from public.reminders
where status = 'pending' and created_at < now() - interval '15 minutes'
having count(*) > 0

union all
-- 4. Relances refusées, rejetées ou signalées comme spam sur les dernières 24 h.
select 'attention|' || count(*) || ' relance(s) en échec, rejetée(s) ou signalée(s) en spam sur 24 h ('
       || string_agg(distinct status, ', ') || ').'
from public.reminders
where status in ('failed', 'bounced', 'complained')
  and coalesce(bounced_at, complained_at, created_at) > now() - interval '24 hours'
having count(*) > 0

union all
-- 5. Relances envoyées à Resend sans aucun accusé (livrée, rejetée…) après 2 h :
--    le webhook Resend n'arrive probablement plus (secret, URL ou domaine à vérifier).
select 'attention|' || count(*) || ' relance(s) envoyée(s) depuis plus de 2 h sans accusé de livraison '
       || 'de Resend sur 7 jours : vérifier le webhook Resend.'
from public.reminders
where status = 'sent' and resend_id is not null
  and sent_at between now() - interval '7 days' and now() - interval '2 hours'
having count(*) > 0;
