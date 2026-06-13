-- Public, privacy-safe batch RPC for peer profile reads.
-- Returns ONLY fields safe to expose to a mutually-matched peer.
-- Excludes: trust_score, readiness_score, location_risk_score, location_mismatch_count,
--           lat_approx, lng_approx, home/current/verified_country_code, travel_*,
--           account_restricted*, subscription_tier, premium_until, message_pass_until,
--           badge_paid, beta_member, daily_message_*, trust_level, account_restricted_*.

CREATE OR REPLACE FUNCTION public.get_public_match_profiles(_targets uuid[])
RETURNS TABLE(
  id uuid,
  first_name text,
  age integer,
  city text,
  country text,
  gender text,
  intention text,
  interested_in text,
  bio text,
  archetype text,
  photo_url text,
  profile_photo_url text,
  avatar_url text,
  verified boolean,
  preferred_language text,
  relationship_intent text,
  curiosity_level integer,
  emotional_rhythm jsonb,
  interests text[],
  location_enabled boolean,
  location_privacy text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  RETURN QUERY
  SELECT p.id, p.first_name, p.age, p.city, p.country,
         p.gender, p.intention, p.interested_in, p.bio,
         p.archetype, p.photo_url, p.profile_photo_url, p.avatar_url,
         p.verified, p.preferred_language, p.relationship_intent,
         p.curiosity_level, p.emotional_rhythm, p.interests,
         p.location_enabled, p.location_privacy, p.updated_at
  FROM public.profiles p
  WHERE p.id = ANY(_targets)
    AND (
      p.id = _me
      OR EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.mutual_interest = true
          AND ((m.user_id = _me AND m.matched_user_id = p.id)
            OR (m.user_id = p.id AND m.matched_user_id = _me))
      )
    );
END $$;

REVOKE EXECUTE ON FUNCTION public.get_public_match_profiles(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_match_profiles(uuid[]) TO authenticated;

-- Also harden the single-row variant: it already exists; just ensure anon cannot call it.
REVOKE EXECUTE ON FUNCTION public.get_public_match_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_match_profile(uuid) TO authenticated;