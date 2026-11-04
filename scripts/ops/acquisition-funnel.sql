-- Read-only operator report. Run only with an authorized private database connection.
-- Milestones after installation, except signup backfilled from profiles.created_at.
-- Counts are separate stages, not a strictly nested funnel: users can pay before importing.
select date_trunc('week',p.created_at at time zone 'UTC')::date as signup_week,
 count(*) as signups,
 count(*) filter(where first_invoice is not null) as first_real_invoice,
 count(*) filter(where reminders_activated is not null) as activated,
 count(*) filter(where first_email_accepted is not null) as first_email_accepted,
 count(*) filter(where subscription_active is not null) as active_subscription_observed,
 count(*) filter(where first_payment is not null) as nonzero_payment_confirmed
from public.profiles p
left join lateral (
 select max(occurred_at) filter(where event='first_invoice') first_invoice,
 max(occurred_at) filter(where event='reminders_activated') reminders_activated,
 max(occurred_at) filter(where event='first_email_accepted') first_email_accepted,
 max(occurred_at) filter(where event='subscription_active') subscription_active,
 max(occurred_at) filter(where event='first_payment') first_payment
 from public.activation_events e where e.user_id=p.id
) e on true
group by 1 order by 1 desc;
