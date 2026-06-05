-- Drop legacy photo-reveal RPCs
DROP FUNCTION IF EXISTS public.consent_photo_reveal(uuid);
DROP FUNCTION IF EXISTS public.get_photo_reveal_status(uuid);

-- Recreate discover_profiles without photo_reveal_stage
DROP FUNCTION IF EXISTS public.discover_profiles(integer,integer,boolean,text,text,text,integer,integer);
CREATE FUNCTION public.discover_profiles(
  _limit integer DEFAULT 30, _radius_km integer DEFAULT NULL, _nearby_only boolean DEFAULT false,
  _country text DEFAULT NULL, _language text DEFAULT NULL, _intent text DEFAULT NULL,
  _age_min integer DEFAULT NULL, _age_max integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid, first_name text, age integer, city text, gender text, intention text, interested_in text,
  bio text, archetype text, photo_url text,
  compatibility_score integer, curiosity_level integer, emotional_rhythm jsonb, verified boolean,
  country text, preferred_language text, relationship_intent text,
  location_enabled boolean, location_privacy text,
  lat_approx numeric, lng_approx numeric, distance_km numeric,
  strengths text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _me_lat numeric; _me_lng numeric; _me_loc boolean;
BEGIN
  SELECT p.lat_approx, p.lng_approx, p.location_enabled
    INTO _me_lat, _me_lng, _me_loc FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH cands AS (
    SELECT p.*,
      CASE WHEN p.location_enabled AND p.lat_approx IS NOT NULL AND p.lng_approx IS NOT NULL
             AND _me_lat IS NOT NULL AND _me_lng IS NOT NULL
        THEN ROUND((6371 * acos(LEAST(1.0, GREATEST(-1.0,
              cos(radians(_me_lat)) * cos(radians(p.lat_approx)) *
              cos(radians(p.lng_approx) - radians(_me_lng)) +
              sin(radians(_me_lat)) * sin(radians(p.lat_approx))))))::numeric, 1)
      END AS _dist
    FROM public.profiles p
    WHERE p.id <> auth.uid()
      AND COALESCE(p.onboarding_complete, false) = true
      AND NOT EXISTS (SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()))
      AND NOT EXISTS (SELECT 1 FROM public.matches mm
        WHERE mm.user_id = auth.uid() AND mm.matched_user_id = p.id
          AND (mm.passed = true OR mm.mutual_interest = true))
      AND (_country  IS NULL OR p.country = _country)
      AND (_language IS NULL OR p.preferred_language = _language)
      AND (_intent   IS NULL OR p.relationship_intent = _intent OR p.intention = _intent)
      AND (_age_min  IS NULL OR p.age >= _age_min)
      AND (_age_max  IS NULL OR p.age <= _age_max)
  ),
  scored AS (
    SELECT c.*, cc.overall AS pair_score, cc.strengths AS pair_strengths
    FROM cands c CROSS JOIN LATERAL public.compute_compatibility(auth.uid(), c.id) cc
  )
  SELECT s.id, s.first_name, s.age, s.city, s.gender, s.intention, s.interested_in,
         s.bio, s.archetype, s.photo_url,
         s.pair_score, s.curiosity_level, s.emotional_rhythm, s.verified,
         s.country, s.preferred_language, s.relationship_intent,
         s.location_enabled, s.location_privacy,
         CASE WHEN s.location_enabled AND s.location_privacy <> 'hidden' THEN s.lat_approx END,
         CASE WHEN s.location_enabled AND s.location_privacy <> 'hidden' THEN s.lng_approx END,
         s._dist, s.pair_strengths
  FROM scored s
  WHERE s.pair_score >= 60
    AND (NOT COALESCE(_nearby_only, false)
         OR (s.location_enabled AND _me_loc AND _radius_km IS NOT NULL
             AND s._dist IS NOT NULL AND s._dist <= _radius_km))
  ORDER BY s.pair_score DESC, s.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END; $$;

REVOKE EXECUTE ON FUNCTION public.discover_profiles(integer,integer,boolean,text,text,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discover_profiles(integer,integer,boolean,text,text,text,integer,integer) TO authenticated;

-- Drop dormant columns
ALTER TABLE public.matches
  DROP COLUMN IF EXISTS photo_reveal_user_consent,
  DROP COLUMN IF EXISTS photo_reveal_matched_consent,
  DROP COLUMN IF EXISTS photo_reveal_unlocked,
  DROP COLUMN IF EXISTS photo_reveal_unlocked_at,
  DROP COLUMN IF EXISTS reveal_stage;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS photo_reveal_stage;

-- Drop the now-unused enum
DROP TYPE IF EXISTS public.reveal_stage;
