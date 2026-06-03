
-- 1. Profile axes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personality_axes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Hidden-match view/unlock log
CREATE TABLE IF NOT EXISTS public.hidden_match_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('view','unlock','message')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.hidden_match_views TO authenticated;
GRANT ALL ON public.hidden_match_views TO service_role;

ALTER TABLE public.hidden_match_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hmv_insert_own" ON public.hidden_match_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hmv_select_own" ON public.hidden_match_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS hmv_user_kind_idx ON public.hidden_match_views(user_id, kind, created_at DESC);

-- 3. Helper: derive a -1..1 axis value from a personality_blueprint row
CREATE OR REPLACE FUNCTION public.profile_axes(_uid uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pb public.personality_blueprint%ROWTYPE;
  ans jsonb;
  social numeric := 0;
  planning numeric := 0;
  cognition numeric := 0;
  role_axis numeric := 0;
BEGIN
  SELECT * INTO pb FROM public.personality_blueprint WHERE user_id = _uid;
  SELECT answers->'discover' INTO ans FROM public.onboarding_answers WHERE user_id = _uid;

  -- introvert (-1) ↔ extrovert (+1)
  IF pb.communication_style = 'expressive' THEN social := 0.7;
  ELSIF pb.communication_style = 'reserved' THEN social := -0.7; END IF;
  IF ans IS NOT NULL AND (ans->>'social') IS NOT NULL THEN
    IF ans->>'social' = 'crowd' THEN social := social + 0.5;
    ELSIF ans->>'social' = 'alone' THEN social := social - 0.5;
    END IF;
  END IF;

  -- dreamer (-1) ↔ planner (+1)
  IF pb.leadership_style = 'planner' THEN planning := 0.7;
  ELSIF pb.leadership_style = 'visionary' THEN planning := -0.5; END IF;
  IF ans IS NOT NULL AND ans->>'plans' = 'structured' THEN planning := planning + 0.4;
  ELSIF ans IS NOT NULL AND ans->>'plans' = 'spontaneous' THEN planning := planning - 0.4; END IF;

  -- creative (-1) ↔ analytical (+1)
  IF pb.conflict_style = 'logical' THEN cognition := 0.6;
  ELSIF pb.conflict_style = 'emotional' THEN cognition := -0.6; END IF;

  -- supporter (-1) ↔ leader (+1)
  IF pb.leadership_style = 'leader' THEN role_axis := 0.8;
  ELSIF pb.leadership_style = 'supporter' THEN role_axis := -0.8; END IF;

  RETURN jsonb_build_object(
    'social',    GREATEST(-1, LEAST(1, social)),
    'planning',  GREATEST(-1, LEAST(1, planning)),
    'cognition', GREATEST(-1, LEAST(1, cognition)),
    'role',      GREATEST(-1, LEAST(1, role_axis))
  );
END $$;

-- 4. Why-we-match (joint similarity + complementary)
CREATE OR REPLACE FUNCTION public.compute_why_we_match(_a uuid, _b uuid)
RETURNS TABLE(
  similarity_score int,
  complementary_score int,
  shared_values text[],
  growth_opportunities text[],
  communication_dynamics text,
  strengths text[],
  challenges text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cc record;
  axa jsonb := public.profile_axes(_a);
  axb jsonb := public.profile_axes(_b);
  diff numeric;
  comp int;
  growth text[] := ARRAY[]::text[];
BEGIN
  SELECT * INTO cc FROM public.compute_compatibility(_a, _b);

  diff := ABS(COALESCE((axa->>'social')::numeric,0)    - COALESCE((axb->>'social')::numeric,0))
        + ABS(COALESCE((axa->>'planning')::numeric,0)  - COALESCE((axb->>'planning')::numeric,0))
        + ABS(COALESCE((axa->>'cognition')::numeric,0) - COALESCE((axb->>'cognition')::numeric,0))
        + ABS(COALESCE((axa->>'role')::numeric,0)      - COALESCE((axb->>'role')::numeric,0));
  -- diff range 0..8; map to 30..100 complementary score
  comp := ROUND(30 + (diff / 8.0) * 70);

  IF ABS(COALESCE((axa->>'social')::numeric,0)    - COALESCE((axb->>'social')::numeric,0)) > 0.8
    THEN growth := growth || 'Introvert ↔ Extrovert balance'; END IF;
  IF ABS(COALESCE((axa->>'planning')::numeric,0)  - COALESCE((axb->>'planning')::numeric,0)) > 0.8
    THEN growth := growth || 'Dreamer ↔ Planner synergy'; END IF;
  IF ABS(COALESCE((axa->>'cognition')::numeric,0) - COALESCE((axb->>'cognition')::numeric,0)) > 0.8
    THEN growth := growth || 'Creative ↔ Analytical contrast'; END IF;
  IF ABS(COALESCE((axa->>'role')::numeric,0)      - COALESCE((axb->>'role')::numeric,0)) > 0.8
    THEN growth := growth || 'Leader ↔ Supporter pairing'; END IF;

  RETURN QUERY SELECT
    cc.overall,
    comp,
    cc.strengths,
    growth,
    CASE
      WHEN cc.communication >= 80 THEN 'Highly compatible communication styles'
      WHEN cc.communication >= 60 THEN 'Comfortable rhythm — small frictions are surmountable'
      ELSE 'Different styles — clarity will be your work together'
    END,
    cc.strengths,
    cc.friction;
END $$;

-- 5. Hidden Matches discovery
CREATE OR REPLACE FUNCTION public.discover_hidden_matches(_limit int DEFAULT 20)
RETURNS TABLE(
  id uuid,
  first_name text,
  age int,
  city text,
  country text,
  archetype text,
  bio text,
  photo_url text,
  similarity_score int,
  complementary_score int,
  shared_values text[],
  growth_opportunities text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH cands AS (
    SELECT p.id, p.first_name, p.age, p.city, p.country, p.archetype, p.bio, p.photo_url
    FROM public.profiles p
    WHERE p.id <> auth.uid()
      AND COALESCE(p.onboarding_complete,false) = true
      AND NOT EXISTS (SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()))
      AND NOT EXISTS (SELECT 1 FROM public.matches mm
        WHERE mm.user_id = auth.uid() AND mm.matched_user_id = p.id
          AND (mm.passed = true OR mm.mutual_interest = true))
  ),
  scored AS (
    SELECT c.*, w.* FROM cands c
    CROSS JOIN LATERAL public.compute_why_we_match(auth.uid(), c.id) w
  )
  SELECT s.id, s.first_name, s.age, s.city, s.country, s.archetype, s.bio, s.photo_url,
         s.similarity_score, s.complementary_score, s.shared_values, s.growth_opportunities
  FROM scored s
  WHERE s.similarity_score >= 65            -- values must be aligned
    AND s.complementary_score >= 70         -- but personality must complement
  ORDER BY (s.complementary_score * 0.6 + s.similarity_score * 0.4) DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
END $$;
