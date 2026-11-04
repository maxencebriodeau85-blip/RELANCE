-- First-party activation milestones. No email, customer invoice content or free text.
create table public.activation_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null check (event in ('signup','first_invoice','reminders_activated','first_email_accepted','subscription_active','first_payment')),
  occurred_at timestamptz not null default clock_timestamp(),
  primary key (user_id,event)
);
create index activation_events_event_time_idx on public.activation_events(event,occurred_at);
alter table public.activation_events enable row level security;
create policy activation_events_own on public.activation_events for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.activation_events from public,anon,authenticated;
grant select on public.activation_events to authenticated;

create function public.record_activation_milestone() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; milestone text;
begin
  if TG_TABLE_NAME = 'profiles' then
    owner_id := NEW.id;
    if TG_OP = 'INSERT' then
      insert into public.activation_events(user_id,event) values(owner_id,'signup') on conflict do nothing;
    end if;
    if NEW.plan in ('starter','pro','business') and NEW.subscription_status = 'active' then milestone := 'subscription_active'; end if;
  elsif TG_TABLE_NAME = 'invoices' then
    owner_id := NEW.user_id;
    if NEW.is_sample then return NEW; end if;
    if TG_OP = 'INSERT' then
      insert into public.activation_events(user_id,event) values(owner_id,'first_invoice') on conflict do nothing;
    end if;
    if not NEW.reminders_paused and NEW.balance_checked_at between now()-interval '7 days' and now()
       and NEW.status not in ('paid','disputed') and NEW.amount > coalesce(NEW.amount_paid,0)
       and nullif(btrim(NEW.client_email),'') is not null then milestone := 'reminders_activated'; end if;
  elsif TG_TABLE_NAME = 'reminders' then
    owner_id := NEW.user_id;
    if NEW.status in ('sent','delivered') and exists(select 1 from public.invoices i where i.id=NEW.invoice_id and i.user_id=owner_id and not i.is_sample) then milestone := 'first_email_accepted'; end if;
  end if;
  if milestone is not null then
    insert into public.activation_events(user_id,event) values(owner_id,milestone) on conflict do nothing;
  end if;
  return NEW;
end $$;
revoke all on function public.record_activation_milestone() from public,anon,authenticated;
create trigger activation_profile after insert or update on public.profiles for each row execute function public.record_activation_milestone();
create trigger activation_invoice after insert or update on public.invoices for each row execute function public.record_activation_milestone();
create trigger activation_reminder after insert or update on public.reminders for each row execute function public.record_activation_milestone();

-- Only the signed Stripe webhook, using service_role, can confirm a non-zero payment.
create function public.record_activation_payment(p_customer text,p_subscription text,p_amount_paid bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_amount_paid <= 0 or p_amount_paid is null then return; end if;
  insert into public.activation_events(user_id,event)
    select id,'first_payment' from public.profiles
    where stripe_customer_id=p_customer and stripe_subscription_id=p_subscription
    on conflict do nothing;
end $$;
revoke all on function public.record_activation_payment(text,text,bigint) from public,anon,authenticated;
grant execute on function public.record_activation_payment(text,text,bigint) to service_role;
-- Signup timestamps are known; other historical milestones are deliberately not invented.
insert into public.activation_events(user_id,event,occurred_at)
  select id,'signup',created_at from public.profiles where created_at is not null on conflict do nothing;
