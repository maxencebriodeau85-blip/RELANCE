-- Abonnement souscrit pendant l'essai : Stripe ne prélève qu'à la fin de
-- l'essai (statut « trialing »). Ces comptes reçoivent aussi les emails J-7 et
-- J-1, avec un texte qui annonce le premier prélèvement plutôt que d'inviter à
-- s'abonner : les réseaux de cartes exigent de prévenir avant qu'un essai
-- gratuit se transforme en abonnement payant.
-- Le type de retour change (colonne « subscribed ») : il faut recréer la
-- fonction, puis remettre ses droits.
drop function if exists public.claim_trial_reminders(int, int);

create function public.claim_trial_reminders(p_days int, p_limit int default 40)
returns table(user_id uuid, email text, company_name text, trial_ends_at timestamptz,
  invoices int, outstanding numeric, reminders_sent int, subscribed boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if p_days is null or p_days not in (1, 7) or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Paramètres invalides' using errcode = '22023';
  end if;
  return query
  with due as (
    select p.id from public.profiles p join auth.users u on u.id = p.id
    where (p.plan = 'free_trial' or p.subscription_status = 'trialing')
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
    returning p.id, p.company_name, p.trial_ends_at, coalesce(p.subscription_status = 'trialing', false) as subscribed
  )
  select c.id, u.email::text, c.company_name, c.trial_ends_at,
    (select count(*)::int from public.invoices i where i.user_id = c.id),
    (select coalesce(sum(greatest(0, i.amount - coalesce(i.amount_paid, 0))) filter (where i.status <> 'paid'), 0)
       from public.invoices i where i.user_id = c.id),
    (select count(*)::int from public.reminders r where r.user_id = c.id and r.status not in ('pending', 'failed')),
    c.subscribed
  from claimed c join auth.users u on u.id = c.id
  order by c.trial_ends_at, c.id;
end $$;

revoke all on function public.claim_trial_reminders(int, int) from public, anon, authenticated;
grant execute on function public.claim_trial_reminders(int, int) to service_role;
