create table public.collection_worker (
 name text primary key, cursor_id uuid, lease_id uuid, lease_until timestamptz,
 started_at timestamptz, completed_at timestamptz, last_result jsonb
);
alter table public.collection_worker enable row level security;
revoke all on public.collection_worker from public,anon,authenticated;
grant all on public.collection_worker to service_role;
insert into public.collection_worker(name) values('reminders');
create function public.claim_collection_worker() returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.collection_worker%rowtype; token uuid:=gen_random_uuid();
begin
 select * into w from public.collection_worker where name='reminders' for update;
 if w.lease_until>now() then return null; end if;
 update public.collection_worker set lease_id=token,lease_until=now()+interval '120 seconds',started_at=now() where name='reminders';
 -- Bounded operational retention; no customer invoice deletion.
 delete from public.request_buckets where window_start<now()-interval '2 days';
 delete from public.integration_requests where created_at<now()-interval '30 days';
 return jsonb_build_object('lease_id',token,'cursor_id',w.cursor_id);
end $$;
create function public.finish_collection_worker(p_lease uuid,p_cursor uuid,p_result jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.collection_worker set cursor_id=p_cursor,completed_at=now(),last_result=p_result,lease_until=null,lease_id=null where name='reminders' and lease_id=p_lease;
 return found;
end $$;
revoke all on function public.claim_collection_worker(),public.finish_collection_worker(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_collection_worker(),public.finish_collection_worker(uuid,uuid,jsonb) to service_role;
create policy server_only on public.collection_worker to service_role using(true) with check(true);
