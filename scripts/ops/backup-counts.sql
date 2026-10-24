-- Comptages de référence pour vérifier qu'une sauvegarde restaurée est complète.
-- Une ligne « schéma.table|nombre » par table, triée, pour un diff exact.
-- Ce fichier contient des volumes de production : il reste dans l'archive chiffrée
-- et n'est jamais affiché dans les journaux.
--
-- Tables exclues : journaux techniques en ajout continu ou purgés automatiquement
-- (claim_collection_worker), qui changent entre l'export et le comptage et
-- provoqueraient de fausses alertes :
--   request_buckets       compteur anti-abus (fenêtres glissantes)
--   integration_requests  journal d'idempotence de l'API d'intégration (30 jours)
-- Aucune autre table des migrations n'est un journal en ajout continu.
select t.table_schema || '.' || t.table_name || '|' ||
  (xpath('/row/c/text()', query_to_xml(
     format('select count(*) as c from %I.%I', t.table_schema, t.table_name), false, true, '')))[1]::text
from information_schema.tables t
where t.table_type = 'BASE TABLE'
  and (
    (t.table_schema = 'public'
       and t.table_name not in ('request_buckets', 'integration_requests'))
    or (t.table_schema = 'auth' and t.table_name in ('users', 'identities'))
    or (t.table_schema = 'supabase_migrations' and t.table_name = 'schema_migrations')
  )
order by 1;
