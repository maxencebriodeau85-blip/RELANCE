-- Comptages de référence pour vérifier qu'une sauvegarde restaurée est complète.
-- Une ligne « schéma.table|nombre » par table, triée, pour un diff exact.
select t.table_schema || '.' || t.table_name || '|' ||
  (xpath('/row/c/text()', query_to_xml(
     format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text
from information_schema.tables t
where t.table_type = 'BASE TABLE'
  and (t.table_schema = 'public' or (t.table_schema = 'auth' and t.table_name in ('users', 'identities')))
  and t.table_name <> 'request_buckets' -- compteur anti-abus, change en permanence
order by 1;
