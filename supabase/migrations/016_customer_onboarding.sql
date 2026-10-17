-- Snapshot registration details at creation; never trust editable metadata for billing.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_terms_version text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_terms_recorded_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_professional_use boolean;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, email, company_name, plan, trial_ends_at,
    signup_terms_version, signup_terms_recorded_at, signup_professional_use)
  VALUES(NEW.id, NEW.email, nullif(left(btrim(NEW.raw_user_meta_data->>'company_name'), 200), ''),
    'free_trial', NOW() + INTERVAL '30 days',
    left(NEW.raw_user_meta_data->>'terms_version', 100),
    CASE WHEN NEW.raw_user_meta_data->>'terms_version' IS NOT NULL THEN NOW() END,
    NEW.raw_user_meta_data->>'professional_use' = 'true');
  RETURN NEW;
END;
$$;

-- Recover the company name only where the user has not already filled it in.
UPDATE public.profiles p SET company_name = left(btrim(u.raw_user_meta_data->>'company_name'), 200)
FROM auth.users u WHERE p.id = u.id AND nullif(btrim(p.company_name), '') IS NULL
AND nullif(btrim(u.raw_user_meta_data->>'company_name'), '') IS NOT NULL;
-- Existing acceptance metadata stays historical; do not invent an acceptance date.

CREATE OR REPLACE FUNCTION public.protect_signup_record()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND
    (NEW.signup_terms_version IS DISTINCT FROM OLD.signup_terms_version OR
     NEW.signup_terms_recorded_at IS DISTINCT FROM OLD.signup_terms_recorded_at OR
     NEW.signup_professional_use IS DISTINCT FROM OLD.signup_professional_use) THEN
    RAISE EXCEPTION 'Registration record is not editable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_signup_record ON public.profiles;
CREATE TRIGGER trg_protect_signup_record BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_signup_record();
