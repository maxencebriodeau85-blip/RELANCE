-- 012_enforce_invoice_quota.sql
--
-- Atomic, race-proof enforcement of the monthly invoice quota.
--
-- The application already checks the quota before inserting (see
-- app/api/invoices/import/route.ts), but that check is a read-then-write:
-- two concurrent imports can both read count=X, both pass, and both insert —
-- letting a paid account exceed its plan limit (a billing-integrity hole).
--
-- This trigger closes the window in the database itself:
--   * a per-user transaction advisory lock serialises concurrent inserts for
--     the same user, so the COUNT below can't be raced by a parallel import
--     (MVCC would otherwise hide the other transaction's uncommitted rows);
--   * the COUNT is re-evaluated per row, so a multi-row INSERT is capped
--     exactly at the limit and rolls back atomically if it would overflow.
--
-- Limits are kept in sync with lib/metrics.ts PLAN_LIMITS. If you change the
-- limits there, change them here too.

create or replace function enforce_invoice_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan        text;
  v_limit       int;
  v_count       int;
  v_month_start timestamptz := date_trunc('month', now());
begin
  -- Serialise concurrent inserts for this user (held until the tx ends).
  perform pg_advisory_xact_lock(hashtext('invoice_quota:' || new.user_id::text));

  select plan into v_plan from profiles where id = new.user_id;

  v_limit := case coalesce(v_plan, 'free_trial')
    when 'starter'  then 30
    when 'pro'      then 200
    when 'business' then 1000
    else 10 -- free_trial
  end;

  select count(*) into v_count
    from invoices
    where user_id = new.user_id
      and created_at >= v_month_start;

  if v_count >= v_limit then
    raise exception 'Invoice quota exceeded (% / % this month)', v_count, v_limit
      using errcode = 'check_violation'; -- SQLSTATE 23514, mapped in the API
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_invoice_quota on invoices;
create trigger trg_enforce_invoice_quota
  before insert on invoices
  for each row execute function enforce_invoice_quota();
