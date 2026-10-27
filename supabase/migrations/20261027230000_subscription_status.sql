-- Statut Stripe de l'abonnement, pour prévenir le client quand un paiement
-- échoue (past_due) pendant le délai de grâce, au lieu de le découvrir à la
-- coupure. Écrit uniquement par le serveur (webhook Stripe, synchronisation
-- du Checkout) ; null = pas d'abonnement payant en cours.
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in ('active','trialing','past_due','incomplete'));

-- La garde des colonnes de facturation couvre aussi ce statut : un client ne
-- peut pas effacer lui-même l'alerte de paiement échoué. Même corps que la
-- version en production, plus subscription_status ; search_path fixe.
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
set search_path = public
as $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.invoice_count_month IS DISTINCT FROM OLD.invoice_count_month
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    THEN
      RAISE EXCEPTION 'Colonnes de facturation non modifiables (plan, stripe_*, quota, trial).'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
