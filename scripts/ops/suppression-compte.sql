-- Suppression d'un compte client à sa demande (RGPD, article 17).
-- Délai légal : un mois après la demande. Procédure testée le 27/10/2026
-- (bloc 3 de scripts/ops/recette-base.sql) : la suppression de l'utilisateur
-- efface en cascade ses données dans les 15 tables, sans toucher aux autres comptes.
--
-- 1. Vérifier que la demande vient bien de l'adresse du compte.
-- 2. Lancer la requête AVANT (Supabase > RECOUVREMENT > SQL Editor) après
--    avoir remplacé l'adresse. Noter l'identifiant affiché.
-- 3. Si `abonnement_stripe` n'est pas vide : résilier d'abord l'abonnement
--    dans Stripe (Clients > le client > Annuler immédiatement), sinon Stripe
--    continuerait à prélever un compte supprimé.
-- 4. Proposer l'export (Paramètres > Vos données) s'il ne l'a pas déjà fait.
-- 5. Supprimer : Supabase > Authentication > Users > le compte > Delete user.
-- 6. Lancer la requête APRÈS avec l'identifiant noté : tout doit valoir 0.
-- 7. Noter dans le registre privé des suppressions : date de la demande,
--    date d'exécution, identifiant (pas l'adresse). À réappliquer si une
--    sauvegarde antérieure est un jour restaurée.
-- 8. Répondre au client que c'est fait.
-- Les factures d'abonnement restent chez Stripe 10 ans (obligation comptable).

-- ===== AVANT
with u as (select id, email, created_at from auth.users where lower(email) = lower('client@exemple.fr'))
select u.id as identifiant, u.email, u.created_at as inscrit_le,
  p.plan, p.trial_ends_at as fin_essai,
  nullif(p.stripe_subscription_id, '') as abonnement_stripe,
  (select count(*) from public.invoices i where i.user_id = u.id) as factures,
  (select count(*) from public.reminders r where r.user_id = u.id) as relances,
  (select count(*) from public.integration_keys k where k.user_id = u.id and k.revoked_at is null) as cles_api_actives
from u left join public.profiles p on p.id = u.id;

-- ===== APRÈS (remplacer l'identifiant noté à l'étape 2)
with x(id) as (select '00000000-0000-0000-0000-000000000000'::uuid)
select
  (select count(*) from auth.users, x where auth.users.id = x.id) as compte,
  (select count(*) from public.profiles, x where profiles.id = x.id) as profil,
  (select count(*) from public.invoices, x where invoices.user_id = x.id) as factures,
  (select count(*) from public.reminders, x where reminders.user_id = x.id) as relances,
  (select count(*) from public.notifications, x where notifications.user_id = x.id) as notifications,
  (select count(*) from public.contacts, x where contacts.user_id = x.id) as contacts,
  (select count(*) from public.integration_keys, x where integration_keys.user_id = x.id) as cles_api;

-- ===== Conservation : essais non convertis à purger (six mois après la fin de l'essai)
-- Chaque compte listé se supprime avec les étapes 5 à 7 ci-dessus.
select u.id as identifiant, p.trial_ends_at as fin_essai, u.last_sign_in_at as derniere_connexion
from public.profiles p join auth.users u on u.id = p.id
where p.plan = 'free_trial' and p.trial_ends_at < now() - interval '6 months'
  and nullif(p.stripe_subscription_id, '') is null
order by p.trial_ends_at;
