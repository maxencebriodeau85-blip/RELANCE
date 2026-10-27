-- Emails de fin d'essai (J-7 et J-1) : un seul envoi par compte et par étape.
-- Les colonnes servent de réservation : le passage quotidien les remplit avant
-- d'envoyer, un second passage simultané ne reprend donc jamais le même compte.
alter table public.profiles
  add column if not exists trial_reminder_7_sent_at timestamptz,
  add column if not exists trial_reminder_1_sent_at timestamptz;

-- Réserve les comptes à prévenir et renvoie de quoi personnaliser l'email.
-- p_days = 7 : essai qui se termine dans 2 à 7 jours ; p_days = 1 : dans
-- moins de 36 h. Fenêtres larges : un passage manqué est rattrapé le
-- lendemain. Seuls les comptes en essai, avec une adresse confirmée.
create or replace function public.claim_trial_reminders(p_days int, p_limit int default 40)
returns table(user_id uuid, email text, company_name text, trial_ends_at timestamptz,
  invoices int, outstanding numeric, reminders_sent int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if p_days is null or p_days not in (1, 7) or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Paramètres invalides' using errcode = '22023';
  end if;
  return query
  with due as (
    select p.id from public.profiles p join auth.users u on u.id = p.id
    where p.plan = 'free_trial'
      and u.email is not null and u.email_confirmed_at is not null
      and case when p_days = 7
        then p.trial_reminder_7_sent_at is null
          and p.trial_ends_at > now() + interval '2 days' and p.trial_ends_at <= now() + interval '7 days'
        else p.trial_reminder_1_sent_at is null
          and p.trial_ends_at > now() and p.trial_ends_at <= now() + interval '36 hours'
      end
    order by p.trial_ends_at, p.id
    limit p_limit
    for update of p skip locked
  ), claimed as (
    update public.profiles p set
      trial_reminder_7_sent_at = case when p_days = 7 then now() else p.trial_reminder_7_sent_at end,
      trial_reminder_1_sent_at = case when p_days = 1 then now() else p.trial_reminder_1_sent_at end
    from due where p.id = due.id
    returning p.id, p.company_name, p.trial_ends_at
  )
  select c.id, u.email::text, c.company_name, c.trial_ends_at,
    (select count(*)::int from public.invoices i where i.user_id = c.id),
    (select coalesce(sum(greatest(0, i.amount - coalesce(i.amount_paid, 0))) filter (where i.status <> 'paid'), 0)
       from public.invoices i where i.user_id = c.id),
    (select count(*)::int from public.reminders r where r.user_id = c.id and r.status not in ('pending', 'failed'))
  from claimed c join auth.users u on u.id = c.id
  order by c.trial_ends_at, c.id;
end $$;

-- Libère une réservation quand le prestataire a refusé l'email (erreur
-- définitive) : le compte sera repris au passage suivant.
create or replace function public.release_trial_reminder(p_user uuid, p_days int)
returns void language sql security definer set search_path = '' as $$
  update public.profiles set
    trial_reminder_7_sent_at = case when p_days = 7 then null else trial_reminder_7_sent_at end,
    trial_reminder_1_sent_at = case when p_days = 1 then null else trial_reminder_1_sent_at end
  where id = p_user;
$$;

revoke all on function public.claim_trial_reminders(int, int), public.release_trial_reminder(uuid, int)
  from public, anon, authenticated;
grant execute on function public.claim_trial_reminders(int, int), public.release_trial_reminder(uuid, int)
  to service_role;

-- Alignement sur la production (migration distante 013_security_lint_fixes,
-- absente du dépôt) : la fonction de quota ne sert que de déclencheur, elle
-- n'a pas à être appelable par l'API. Sans effet sur le déclencheur lui-même.
revoke execute on function public.enforce_invoice_quota() from public, anon, authenticated;
