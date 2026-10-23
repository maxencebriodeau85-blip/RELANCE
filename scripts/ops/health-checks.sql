-- Contrôles de production lancés chaque heure par .github/workflows/monitor.yml.
-- Chaque ligne renvoyée est un problème « gravité|message ». Aucune ligne = tout va bien.
-- Requêtes en lecture seule.
set statement_timeout = '15s';

-- 1. Le passage quotidien des relances ne s'est pas exécuté depuis plus de 26 h.
select 'critique|Relances automatiques : aucun passage terminé depuis '
       || floor(extract(epoch from now() - completed_at) / 3600) || ' h (dernier : '
       || to_char(completed_at at time zone 'Europe/Paris', 'DD/MM HH24:MI') || ').'
from public.collection_worker
where name = 'reminders' and completed_at is not null
  and completed_at < now() - interval '26 hours'

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
having count(*) > 0;
