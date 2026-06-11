
-- 1. Profiles: add travel + trust columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_country_code TEXT,
  ADD COLUMN IF NOT EXISTS home_country_name TEXT,
  ADD COLUMN IF NOT EXISTS current_country_code TEXT,
  ADD COLUMN IF NOT EXISTS current_country_name TEXT,
  ADD COLUMN IF NOT EXISTS travel_status TEXT NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS travel_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_country_code TEXT,
  ADD COLUMN IF NOT EXISTS trust_level TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS location_risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_mismatch_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing country_code / country
UPDATE public.profiles
   SET home_country_code = COALESCE(home_country_code, country_code),
       current_country_code = COALESCE(current_country_code, country_code),
       home_country_name = COALESCE(home_country_name, country),
       current_country_name = COALESCE(current_country_name, country)
 WHERE country_code IS NOT NULL OR country IS NOT NULL;

-- Refresh trust_level for already-verified users
UPDATE public.profiles SET trust_level = 'verified' WHERE verified = true AND trust_level = 'unverified';

-- 2. Update profiles_guard_update to allow new user-editable fields and lock new managed fields
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR current_setting('app.allow_profiles_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.verified            IS DISTINCT FROM OLD.verified
  OR NEW.badge_paid          IS DISTINCT FROM OLD.badge_paid
  OR NEW.trust_score         IS DISTINCT FROM OLD.trust_score
  OR NEW.subscription_tier   IS DISTINCT FROM OLD.subscription_tier
  OR NEW.premium_until       IS DISTINCT FROM OLD.premium_until
  OR NEW.message_pass_until  IS DISTINCT FROM OLD.message_pass_until
  OR NEW.beta_member         IS DISTINCT FROM OLD.beta_member
  OR NEW.readiness_score     IS DISTINCT FROM OLD.readiness_score
  OR NEW.readiness_breakdown IS DISTINCT FROM OLD.readiness_breakdown
  OR NEW.daily_message_count IS DISTINCT FROM OLD.daily_message_count
  OR NEW.daily_message_reset_at IS DISTINCT FROM OLD.daily_message_reset_at
  OR NEW.verified_country_code IS DISTINCT FROM OLD.verified_country_code
  OR NEW.trust_level         IS DISTINCT FROM OLD.trust_level
  OR NEW.location_risk_score IS DISTINCT FROM OLD.location_risk_score
  OR NEW.location_mismatch_count IS DISTINCT FROM OLD.location_mismatch_count
  THEN
    RAISE EXCEPTION 'Field not user-editable on profiles; managed by payment/verification flow';
  END IF;
  RETURN NEW;
END; $function$;

-- 3. set_user_travel_mode helper
CREATE OR REPLACE FUNCTION public.set_user_travel_mode(_current_country_code TEXT, _current_country_name TEXT, _travelling BOOLEAN)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  PERFORM set_config('app.allow_profiles_managed_update', 'true', true);
  IF _travelling THEN
    UPDATE public.profiles
       SET current_country_code = _current_country_code,
           current_country_name = _current_country_name,
           travel_status = 'travelling',
           travel_started_at = COALESCE(travel_started_at, now()),
           updated_at = now()
     WHERE id = _uid;
  ELSE
    UPDATE public.profiles
       SET current_country_code = home_country_code,
           current_country_name = home_country_name,
           travel_status = 'home',
           travel_started_at = NULL,
           updated_at = now()
     WHERE id = _uid;
  END IF;
END; $$;

-- 4. location_verifications table
CREATE TABLE IF NOT EXISTS public.location_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile_country_code TEXT,
  current_country_code TEXT,
  device_country_code TEXT,
  ip_country_code TEXT,
  gps_country_code TEXT,
  match_result TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  vpn_suspected BOOLEAN NOT NULL DEFAULT false,
  selfie_path TEXT,
  user_confirmed_traveling BOOLEAN NOT NULL DEFAULT false
);

GRANT SELECT ON public.location_verifications TO authenticated;
GRANT ALL ON public.location_verifications TO service_role;

ALTER TABLE public.location_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own verifications"
  ON public.location_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all verifications"
  ON public.location_verifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS location_verifications_user_created_idx
  ON public.location_verifications (user_id, created_at DESC);
