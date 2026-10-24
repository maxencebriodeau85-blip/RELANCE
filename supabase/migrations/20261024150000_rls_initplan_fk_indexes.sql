-- Performance RLS et index de clés étrangères (conseiller de performance Supabase).
-- 1. auth.uid() appelé nu dans une policy est réévalué pour chaque ligne lue.
--    Encapsulé dans (select auth.uid()), Postgres le calcule une seule fois par
--    requête (InitPlan). La sémantique est identique : ALTER POLICY conserve les
--    rôles et la commande, et il n'y a aucun instant sans policy. On ne crée pas
--    de WITH CHECK là où il n'en existait pas.
-- 2. Les clés étrangères sans index ralentissent les jointures et les ON DELETE
--    CASCADE / SET NULL. Index simples (pas CONCURRENTLY : la migration tourne
--    dans une transaction et les tables sont petites).
-- Rejouable : ALTER POLICY réécrit la même expression, CREATE INDEX IF NOT EXISTS.
-- Les index signalés « inutilisés » sont conservés : la base est trop jeune pour
-- que les statistiques d'usage soient significatives.

-- api_keys
alter policy "Users can delete own api keys" on public.api_keys
  using ((select auth.uid()) = user_id);
alter policy "Users can insert own api keys" on public.api_keys
  with check ((select auth.uid()) = user_id);
alter policy "Users can view own api keys" on public.api_keys
  using ((select auth.uid()) = user_id);

-- contact_sequences
alter policy "sequences_owner" on public.contact_sequences
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- contacts
alter policy "contacts_owner" on public.contacts
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- email_template_overrides
alter policy "Users manage their own templates" on public.email_template_overrides
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- integrations
alter policy "Users can delete own integrations" on public.integrations
  using ((select auth.uid()) = user_id);
alter policy "Users can insert own integrations" on public.integrations
  with check ((select auth.uid()) = user_id);
alter policy "Users can update own integrations" on public.integrations
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can view own integrations" on public.integrations
  using ((select auth.uid()) = user_id);

-- invoices
alter policy "Users can delete own invoices" on public.invoices
  using ((select auth.uid()) = user_id);
alter policy "Users can insert own invoices" on public.invoices
  with check ((select auth.uid()) = user_id);
alter policy "Users can update own invoices" on public.invoices
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "Users can view own invoices" on public.invoices
  using ((select auth.uid()) = user_id);

-- journal_entries
alter policy "journal_owner" on public.journal_entries
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- notifications
alter policy "notif_read_own" on public.notifications
  using ((select auth.uid()) = user_id);
alter policy "notif_update_own" on public.notifications
  using ((select auth.uid()) = user_id);

-- profiles
alter policy "Users can update own profile" on public.profiles
  using ((select auth.uid()) = id);
alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

-- reminder_scenarios
alter policy "Users can delete own scenarios" on public.reminder_scenarios
  using ((select auth.uid()) = user_id);
alter policy "Users can insert own scenarios" on public.reminder_scenarios
  with check (((select auth.uid()) = user_id) and (user_id is not null));
alter policy "Users can update own scenarios" on public.reminder_scenarios
  using ((select auth.uid()) = user_id);
alter policy "Users can view own and default scenarios" on public.reminder_scenarios
  using (((select auth.uid()) = user_id) or (user_id is null));

-- reminders
alter policy "Users can view own reminders" on public.reminders
  using ((select auth.uid()) = user_id);

-- Index des clés étrangères non couvertes
create index if not exists contact_sequences_contact_id_idx on public.contact_sequences (contact_id);
create index if not exists contact_sequences_user_id_idx on public.contact_sequences (user_id);
create index if not exists invoices_contact_id_idx on public.invoices (contact_id);
create index if not exists journal_entries_user_id_idx on public.journal_entries (user_id);
create index if not exists notifications_contact_id_idx on public.notifications (contact_id);
create index if not exists reminder_scenarios_user_id_idx on public.reminder_scenarios (user_id);
