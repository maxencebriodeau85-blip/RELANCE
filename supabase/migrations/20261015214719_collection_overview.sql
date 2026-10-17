-- One statement / snapshot for every total. PostgREST's row limit must never
-- silently truncate a financial dashboard. Runs with the caller's RLS rights.
CREATE OR REPLACE FUNCTION public.collection_overview() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 WITH owned AS MATERIALIZED (
   SELECT i.*, CASE WHEN i.status = 'paid' THEN 0::numeric
     ELSE greatest(0::numeric, i.amount - coalesce(i.amount_paid, 0)) END AS open_balance
   FROM public.invoices i WHERE i.user_id = (SELECT auth.uid())
 ), clock AS (
   SELECT (now() AT TIME ZONE 'Europe/Paris')::date AS today
 ), totals AS (
   SELECT count(*) AS invoice_count,
     count(*) FILTER (WHERE open_balance > 0) AS active_count,
     coalesce(sum(open_balance), 0) AS outstanding,
     count(*) FILTER (WHERE open_balance > 0 AND due_date < today) AS overdue_count,
     coalesce(sum(open_balance) FILTER (WHERE due_date < today), 0) AS overdue,
     count(*) FILTER (WHERE open_balance > 0 AND promise_date >= today) AS promise_count,
     coalesce(sum(open_balance) FILTER (WHERE promise_date >= today), 0) AS promised,
     coalesce(sum(open_balance) FILTER (WHERE status = 'disputed'), 0) AS disputed,
     count(*) FILTER (WHERE open_balance > 0 AND (balance_checked_at IS NULL OR balance_checked_at < now() - interval '7 days' OR balance_checked_at > now())) AS stale_count,
     coalesce(bool_or(balance_checked_at IS NOT NULL AND reminders_paused = false), false) AS has_verified
   FROM owned CROSS JOIN clock
 ), age AS (
   SELECT b.position, b.label, count(o.id) AS count, coalesce(sum(o.open_balance), 0) AS amount
   FROM (VALUES (0, 'À échoir'), (1, '1–30 jours'), (2, '31–60 jours'), (3, '61–90 jours'), (4, '+90 jours')) b(position, label)
   CROSS JOIN clock
   LEFT JOIN owned o ON o.open_balance > 0 AND b.position = CASE
     WHEN o.due_date >= today THEN 0 WHEN today - o.due_date <= 30 THEN 1
     WHEN today - o.due_date <= 60 THEN 2 WHEN today - o.due_date <= 90 THEN 3 ELSE 4 END
   GROUP BY b.position, b.label
 ), priorities AS (
   SELECT to_jsonb(o) - 'open_balance' AS invoice FROM owned o
   WHERE open_balance > 0 ORDER BY due_date, id LIMIT 12
 )
 SELECT to_jsonb(totals) || jsonb_build_object(
   'aging', (SELECT jsonb_agg(to_jsonb(age) - 'position' ORDER BY position) FROM age),
   'priorities', coalesce((SELECT jsonb_agg(invoice) FROM priorities), '[]'::jsonb)
 ) FROM totals;
$$;
REVOKE ALL ON FUNCTION public.collection_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collection_overview() TO authenticated;
