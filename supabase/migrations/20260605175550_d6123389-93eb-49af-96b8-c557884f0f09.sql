CREATE OR REPLACE FUNCTION public.compute_compatibility(_a uuid, _b uuid)
 RETURNS TABLE(overall integer, communication integer, lifestyle integer, values_score integer, goals integer, strengths text[], friction text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ja jsonb; jb jsonb;
  s_goals int; s_lifestyle int; s_comm int; s_values int; s_overall int;
  _strengths text[] := ARRAY[]::text[];
  _friction text[] := ARRAY[]::text[];
  k_goals text[] := ARRAY['intent','horizon','speed'];
  k_life  text[] := ARRAY['weekend','plans','social','home'];
  k_comm  text[] := ARRAY['conflict','expression','texting'];
  k_vals  text[] := ARRAY['politics','spiritual','money','priorities'];
  k text; va jsonb; vb jsonb;
  m int; t int;
BEGIN
  SELECT answers->'discover' INTO ja FROM public.onboarding_answers WHERE user_id = _a;
  SELECT answers->'discover' INTO jb FROM public.onboarding_answers WHERE user_id = _b;
  IF ja IS NULL OR jb IS NULL THEN
    RETURN QUERY SELECT 60,60,60,60,60, ARRAY[]::text[], ARRAY[]::text[]; RETURN;
  END IF;

  m:=0; t:=0;
  FOREACH k IN ARRAY k_goals LOOP
    va := ja->k; vb := jb->k;
    IF va IS NOT NULL AND vb IS NOT NULL THEN t:=t+1; IF va=vb THEN m:=m+1; END IF; END IF;
  END LOOP;
  s_goals := CASE WHEN t=0 THEN 60 ELSE 40 + (m::float/t*60)::int END;

  m:=0; t:=0;
  FOREACH k IN ARRAY k_life LOOP
    va := ja->k; vb := jb->k;
    IF va IS NOT NULL AND vb IS NOT NULL THEN t:=t+1; IF va=vb THEN m:=m+1; END IF; END IF;
  END LOOP;
  s_lifestyle := CASE WHEN t=0 THEN 60 ELSE 40 + (m::float/t*60)::int END;

  m:=0; t:=0;
  FOREACH k IN ARRAY k_comm LOOP
    va := ja->k; vb := jb->k;
    IF va IS NOT NULL AND vb IS NOT NULL THEN t:=t+1; IF va=vb THEN m:=m+1; END IF; END IF;
  END LOOP;
  s_comm := CASE WHEN t=0 THEN 60 ELSE 40 + (m::float/t*60)::int END;

  m:=0; t:=0;
  FOREACH k IN ARRAY k_vals LOOP
    va := ja->k; vb := jb->k;
    IF va IS NOT NULL AND vb IS NOT NULL THEN t:=t+1; IF va=vb THEN m:=m+1; END IF; END IF;
  END LOOP;
  s_values := CASE WHEN t=0 THEN 60 ELSE 40 + (m::float/t*60)::int END;

  s_overall := ROUND(s_goals*0.30 + s_values*0.28 + s_comm*0.22 + s_lifestyle*0.20);

  IF s_goals    >= 80 THEN _strengths := array_append(_strengths, 'Aligned relationship goals'); END IF;
  IF s_values   >= 80 THEN _strengths := array_append(_strengths, 'Shared core values'); END IF;
  IF s_comm     >= 80 THEN _strengths := array_append(_strengths, 'Compatible communication styles'); END IF;
  IF s_lifestyle>= 80 THEN _strengths := array_append(_strengths, 'Similar lifestyle rhythms'); END IF;
  IF ja->>'intent'  = jb->>'intent'  AND ja->>'intent' IS NOT NULL  THEN _strengths := array_append(_strengths, 'Both want the same kind of relationship'); END IF;
  IF ja->>'horizon' = jb->>'horizon' AND ja->>'horizon' IS NOT NULL THEN _strengths := array_append(_strengths, 'Same 3-year vision'); END IF;

  IF s_goals    < 60 THEN _friction := array_append(_friction, 'Different relationship goals'); END IF;
  IF s_values   < 60 THEN _friction := array_append(_friction, 'Diverging core values'); END IF;
  IF s_comm     < 60 THEN _friction := array_append(_friction, 'Different communication styles'); END IF;
  IF ja->>'speed' IS NOT NULL AND jb->>'speed' IS NOT NULL AND ja->>'speed' <> jb->>'speed'
    THEN _friction := array_append(_friction, 'Different paces of commitment'); END IF;
  IF ja->>'home'  IS NOT NULL AND jb->>'home'  IS NOT NULL AND ja->>'home'  <> jb->>'home'
    THEN _friction := array_append(_friction, 'Different home environments'); END IF;

  RETURN QUERY SELECT s_overall, s_comm, s_lifestyle, s_values, s_goals, _strengths, _friction;
END; $function$;

CREATE OR REPLACE FUNCTION public.compute_why_we_match(_a uuid, _b uuid)
 RETURNS TABLE(similarity_score integer, complementary_score integer, shared_values text[], growth_opportunities text[], communication_dynamics text, strengths text[], challenges text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  comp := ROUND(30 + (diff / 8.0) * 70);

  IF ABS(COALESCE((axa->>'social')::numeric,0)    - COALESCE((axb->>'social')::numeric,0)) > 0.8
    THEN growth := array_append(growth, 'Introvert ↔ Extrovert balance'); END IF;
  IF ABS(COALESCE((axa->>'planning')::numeric,0)  - COALESCE((axb->>'planning')::numeric,0)) > 0.8
    THEN growth := array_append(growth, 'Dreamer ↔ Planner synergy'); END IF;
  IF ABS(COALESCE((axa->>'cognition')::numeric,0) - COALESCE((axb->>'cognition')::numeric,0)) > 0.8
    THEN growth := array_append(growth, 'Creative ↔ Analytical contrast'); END IF;
  IF ABS(COALESCE((axa->>'role')::numeric,0)      - COALESCE((axb->>'role')::numeric,0)) > 0.8
    THEN growth := array_append(growth, 'Leader ↔ Supporter pairing'); END IF;

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
END $function$;