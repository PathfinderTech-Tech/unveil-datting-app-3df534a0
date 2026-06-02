
-- Nearby Discovery: location privacy + radius matching
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_privacy text NOT NULL DEFAULT 'distance',
  ADD COLUMN IF NOT EXISTS discovery_radius_km integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS lat_approx numeric(6,2),
  ADD COLUMN IF NOT EXISTS lng_approx numeric(6,2),
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- location_privacy ∈ ('hidden','country','city','distance')
-- discovery_radius_km: 8/16/40/80/160 or 0 for Global
-- lat/lng stored rounded to 2 decimals (~1.1km grid) for privacy. Never share raw GPS.

CREATE INDEX IF NOT EXISTS idx_profiles_loc ON public.profiles(lat_approx, lng_approx) WHERE location_enabled = true;

-- Replace discover_profiles to include location fields + filters
DROP FUNCTION IF EXISTS public.discover_profiles(integer);
CREATE OR REPLACE FUNCTION public.discover_profiles(
  _limit integer DEFAULT 30,
  _radius_km integer DEFAULT NULL,
  _nearby_only boolean DEFAULT false,
  _country text DEFAULT NULL,
  _language text DEFAULT NULL,
  _intent text DEFAULT NULL,
  _age_min integer DEFAULT NULL,
  _age_max integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid, first_name text, age integer, city text, gender text, intention text,
  interested_in text, bio text, archetype text, photo_url text,
  photo_reveal_stage reveal_stage, compatibility_score integer, curiosity_level integer,
  emotional_rhythm jsonb, verified boolean,
  country text, preferred_language text, relationship_intent text,
  location_enabled boolean, location_privacy text,
  lat_approx numeric, lng_approx numeric,
  distance_km numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT id, lat_approx, lng_approx, country, compatibility_score, location_enabled
    FROM public.profiles WHERE id = auth.uid()
  )
  SELECT p.id, p.first_name, p.age, p.city, p.gender, p.intention, p.interested_in,
         p.bio, p.archetype, p.photo_url, p.photo_reveal_stage, p.compatibility_score,
         p.curiosity_level, p.emotional_rhythm, p.verified,
         p.country, p.preferred_language, p.relationship_intent,
         p.location_enabled, p.location_privacy,
         CASE WHEN p.location_enabled AND p.location_privacy <> 'hidden' THEN p.lat_approx END,
         CASE WHEN p.location_enabled AND p.location_privacy <> 'hidden' THEN p.lng_approx END,
         CASE
           WHEN p.location_enabled AND p.lat_approx IS NOT NULL AND p.lng_approx IS NOT NULL
                AND (SELECT lat_approx FROM me) IS NOT NULL AND (SELECT lng_approx FROM me) IS NOT NULL
           THEN ROUND((
             6371 * acos(
               LEAST(1.0, GREATEST(-1.0,
                 cos(radians((SELECT lat_approx FROM me))) * cos(radians(p.lat_approx)) *
                 cos(radians(p.lng_approx) - radians((SELECT lng_approx FROM me))) +
                 sin(radians((SELECT lat_approx FROM me))) * sin(radians(p.lat_approx))
               ))
             )
           )::numeric, 1)
         END AS distance_km
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND COALESCE(p.onboarding_complete, false) = true
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id      AND b.blocked_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.user_id = auth.uid() AND m.matched_user_id = p.id
    )
    AND (_country  IS NULL OR p.country = _country)
    AND (_language IS NULL OR p.preferred_language = _language)
    AND (_intent   IS NULL OR p.relationship_intent = _intent OR p.intention = _intent)
    AND (_age_min  IS NULL OR p.age >= _age_min)
    AND (_age_max  IS NULL OR p.age <= _age_max)
    AND (
      NOT COALESCE(_nearby_only, false)
      OR (
        p.location_enabled
        AND (SELECT location_enabled FROM me)
        AND _radius_km IS NOT NULL AND _radius_km > 0
        AND p.lat_approx IS NOT NULL AND (SELECT lat_approx FROM me) IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians((SELECT lat_approx FROM me))) * cos(radians(p.lat_approx)) *
              cos(radians(p.lng_approx) - radians((SELECT lng_approx FROM me))) +
              sin(radians((SELECT lat_approx FROM me))) * sin(radians(p.lat_approx))
            ))
          )
        ) <= _radius_km
      )
    )
  ORDER BY
    CASE WHEN _nearby_only THEN 0 ELSE 1 END,
    ABS(COALESCE(p.compatibility_score, 0) - COALESCE((SELECT compatibility_score FROM me), 0)) ASC,
    p.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;
