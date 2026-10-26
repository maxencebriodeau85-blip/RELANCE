-- Leave a trace when the reminders cron is reached but cannot run (no Resend config, claim error).
alter table public.collection_worker
 add column last_attempt_at timestamptz,
 add column last_blocked_reason text constraint collection_worker_blocked_reason_check
  check (last_blocked_reason in ('automation_not_configured','claim_failed'));
create function public.record_collection_worker_attempt(p_reason text) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.collection_worker set last_attempt_at=now(),last_blocked_reason=p_reason where name='reminders';
end $$;
-- Same body as 20261018082548, plus: a successful claim stamps the attempt and clears the blocked reason.
create or replace function public.claim_collection_worker() returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.collection_worker%rowtype; token uuid:=gen_random_uuid();
begin
 select * into w from public.collection_worker where name='reminders' for update;
 if w.lease_until>now() then return null; end if;
 update public.collection_worker set lease_id=token,lease_until=now()+interval '120 seconds',started_at=now(),last_attempt_at=now(),last_blocked_reason=null where name='reminders';
 -- Bounded operational retention; no customer invoice deletion.
 delete from public.request_buckets where window_start<now()-interval '2 days';
 delete from public.integration_requests where created_at<now()-interval '30 days';
 return jsonb_build_object('lease_id',token,'cursor_id',w.cursor_id);
end $$;
revoke all on function public.claim_collection_worker(),public.record_collection_worker_attempt(text) from public,anon,authenticated;
grant execute on function public.claim_collection_worker(),public.record_collection_worker_attempt(text) to service_role;
