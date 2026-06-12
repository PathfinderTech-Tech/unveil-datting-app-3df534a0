
-- 1) Hide privileged operational columns from PostgREST callers (matched peers).
REVOKE SELECT (trust_score, location_risk_score, location_mismatch_count,
               account_restricted_reason, account_restricted_at, subscription_tier)
  ON public.profiles FROM authenticated;
REVOKE SELECT (trust_score, location_risk_score, location_mismatch_count,
               account_restricted_reason, account_restricted_at, subscription_tier)
  ON public.profiles FROM anon;

-- 2) Owner self-read of sensitive fields via SECURITY DEFINER RPC.
CREATE OR REPLACE FUNCTION public.get_my_profile_extras()
RETURNS TABLE (
  trust_score integer,
  location_risk_score integer,
  location_mismatch_count integer,
  account_restricted_reason text,
  account_restricted_at timestamptz,
  subscription_tier public.subscription_tier
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.trust_score, p.location_risk_score, p.location_mismatch_count,
         p.account_restricted_reason, p.account_restricted_at, p.subscription_tier
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile_extras() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_extras() TO authenticated;

-- 3) Admin-only listing of trust signals (bypasses column REVOKE through SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.admin_list_trust_profiles()
RETURNS TABLE (
  id uuid,
  first_name text,
  trust_level text,
  location_risk_score integer,
  location_mismatch_count integer,
  travel_status text,
  travel_expires_at timestamptz,
  travel_warning_count integer,
  account_restricted boolean,
  home_country_code text,
  current_country_code text,
  verified_country_code text,
  verified boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.id, p.first_name, p.trust_level,
         p.location_risk_score, p.location_mismatch_count,
         p.travel_status, p.travel_expires_at, p.travel_warning_count,
         p.account_restricted, p.home_country_code, p.current_country_code,
         p.verified_country_code, p.verified
  FROM public.profiles p
  ORDER BY p.location_risk_score DESC NULLS LAST
  LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_trust_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_trust_profiles() TO authenticated;

-- 4) Explicit RESTRICTIVE deny on direct INSERT into thoughts.
--    The send_thought() SECURITY DEFINER RPC remains the only allowed insert path.
DROP POLICY IF EXISTS thoughts_no_direct_insert ON public.thoughts;
CREATE POLICY thoughts_no_direct_insert
  ON public.thoughts
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
