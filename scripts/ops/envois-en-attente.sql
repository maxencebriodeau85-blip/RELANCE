-- Envois de relance restés « en attente » (pending) : diagnostic et réconciliation.
-- Une relance pending est réservée mais sans accusé du prestataire : Resend a
-- peut-être accepté l'email (réponse perdue) ou peut-être pas. Ne JAMAIS la
-- supprimer ni la renvoyer à l'aveugle : le client recevrait deux fois la même relance.
-- Procédure complète : docs/INCIDENTS.md, cas 2. À lancer dans Supabase > RECOUVREMENT > SQL Editor.

-- ===== 1. Diagnostic : envois en attente depuis plus de 15 minutes
select r.id as relance, r.created_at as reservee_le, r.type as etape,
  'reminder-' || r.id as cle_idempotence_resend,
  i.invoice_number as facture, i.client_email as destinataire, u.email as compte_client
from public.reminders r
join public.invoices i on i.id = r.invoice_id
join auth.users u on u.id = r.user_id
where r.status = 'pending' and r.created_at < now() - interval '15 minutes'
order by r.created_at;

-- ===== 2. Vérifier dans Resend (Emails > rechercher le destinataire et l'heure)
-- puis appliquer UNE des deux corrections, relance par relance.

-- 2a. Resend a bien accepté l'email : compléter l'historique (identifiant re_… lu dans Resend).
-- update public.reminders
--    set status = 'sent', resend_id = 're_REMPLACER', sent_at = coalesce(sent_at, now())
--  where id = 'REMPLACER' and status = 'pending';

-- 2b. Resend confirme qu'aucun email n'est parti : libérer la réservation.
--     La relance repartira au prochain passage quotidien, si la facture est toujours éligible.
-- update public.reminders
--    set status = 'failed'
--  where id = 'REMPLACER' and status = 'pending';

-- ===== 3. Contrôle : plus aucun envoi bloqué
select count(*) as envois_bloques from public.reminders
where status = 'pending' and created_at < now() - interval '15 minutes';
