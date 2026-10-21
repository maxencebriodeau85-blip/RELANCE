-- Batch alerts are a server-only operation. Session owner is verified in the API.
-- No new client INSERT rights, no SECURITY DEFINER, no changes to historical data.
create index if not exists notifications_invoice_dedupe_idx
  on public.notifications(user_id, action_url, created_at desc) where type = 'invoice_overdue';

create or replace function public.generate_collection_notifications(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  generated integer;
  today date := (now() at time zone 'Europe/Paris')::date;
begin
  if p_user_id is null then
    raise exception 'Account required' using errcode = '22023';
  end if;
  -- Serialize sessions/tabs for the same account before checking recent alerts.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('collection-notifications:' || p_user_id::text, 0));
  insert into public.notifications(user_id, type, title, body, action_url)
  select i.user_id, 'invoice_overdue', 'Facture ' || i.invoice_number || ' à vérifier',
    i.client_name || ' — reste à payer enregistré : ' || round(i.amount - coalesce(i.amount_paid, 0), 2)::text || ' EUR. Plus de 30 jours de retard. Vérifiez les règlements et le suivi avant toute relance.',
    '/dashboard/invoices/' || i.id::text
  from public.invoices i
  where i.user_id = p_user_id
    and i.status in ('pending', 'reminded', 'formal_notice')
    and i.amount > coalesce(i.amount_paid, 0)
    and i.due_date < today - 30
    and (i.promise_date is null or i.promise_date < today)
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p_user_id and n.type = 'invoice_overdue'
        and n.action_url = '/dashboard/invoices/' || i.id::text
        and n.created_at >= now() - interval '7 days'
    )
  order by i.due_date, i.id
  limit 100;
  get diagnostics generated = row_count;
  return jsonb_build_object('created', generated, 'limit', 100);
end;
$$;
revoke all on function public.generate_collection_notifications(uuid) from public, anon, authenticated;
grant execute on function public.generate_collection_notifications(uuid) to service_role;
