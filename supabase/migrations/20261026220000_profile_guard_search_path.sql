-- Aligne le dépôt sur la production : RECOUVREMENT a reçu à la main
-- (migration distante « 013_security_lint_fixes », absente du dépôt) un
-- search_path fixe sur la garde des colonnes de facturation. Sans lui, une
-- base recréée depuis le dépôt garde un search_path modifiable, signalé par
-- l'advisor Supabase (function_search_path_mutable).
-- Sans effet sur le comportement : la fonction ne référence aucun objet par
-- son nom. Rejouable.
alter function public.protect_profile_billing_columns() set search_path = public;
