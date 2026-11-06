-- Signed callbacks can arrive out of order. Opened/clicked states also prove
-- provider acceptance; late sent/delivered callbacks never downgrade history.
-- Preserve privileges, owner binding, sample exclusions and occurrence deduplication.
create or replace function public.record_activation_milestone() returns trigger
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
    if NEW.status in ('sent','delivered','opened','clicked') and exists(select 1 from public.invoices i where i.id=NEW.invoice_id and i.user_id=owner_id and not i.is_sample) then milestone := 'first_email_accepted'; end if;
  end if;
  if milestone is not null then
    insert into public.activation_events(user_id,event) values(owner_id,milestone) on conflict do nothing;
  end if;
  return NEW;
end $$;
revoke all on function public.record_activation_milestone() from public,anon,authenticated;
