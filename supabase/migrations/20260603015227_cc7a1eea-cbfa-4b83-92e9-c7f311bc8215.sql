
-- Saved profiles
CREATE TABLE public.saved_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_profiles TO authenticated;
GRANT ALL ON public.saved_profiles TO service_role;
ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_own ON public.saved_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY reactions_select ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY reactions_insert ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY reactions_delete ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Message reads
CREATE TABLE public.message_reads (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
GRANT SELECT, INSERT ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY reads_select ON public.message_reads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reads.message_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY reads_insert ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Typing indicators
CREATE TABLE public.typing_indicators (
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO authenticated;
GRANT ALL ON public.typing_indicators TO service_role;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY typing_select ON public.typing_indicators FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = typing_indicators.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY typing_write ON public.typing_indicators FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages: media + delivery
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text;

-- Matches: pass/save
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false;

-- Update guard trigger to ignore passed/saved flag changes by the row owner
CREATE OR REPLACE FUNCTION public.matches_guard_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.matched_user_id IS DISTINCT FROM OLD.matched_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reveal_stage IS DISTINCT FROM OLD.reveal_stage
     OR NEW.mutual_interest IS DISTINCT FROM OLD.mutual_interest
     OR NEW.share_unlocked IS DISTINCT FROM OLD.share_unlocked
     OR NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score
     OR NEW.chemistry_score IS DISTINCT FROM OLD.chemistry_score
     OR NEW.connection_score IS DISTINCT FROM OLD.connection_score
     OR NEW.interaction_count IS DISTINCT FROM OLD.interaction_count
  THEN
    RAISE EXCEPTION 'Field not user-editable on matches; use security-definer RPCs';
  END IF;
  IF _uid = OLD.user_id THEN
    IF NEW.matched_user_interested IS DISTINCT FROM OLD.matched_user_interested
       OR NEW.share_matched_consent IS DISTINCT FROM OLD.share_matched_consent
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSIF _uid = OLD.matched_user_id THEN
    IF NEW.user_interested IS DISTINCT FROM OLD.user_interested
       OR NEW.share_user_consent IS DISTINCT FROM OLD.share_user_consent
       OR NEW.passed IS DISTINCT FROM OLD.passed
       OR NEW.saved IS DISTINCT FROM OLD.saved
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;
  RETURN NEW;
END; $function$;

-- Pass RPC
CREATE OR REPLACE FUNCTION public.pass_profile(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.matches (user_id, matched_user_id, user_interested, passed)
  VALUES (_me, _target, false, true) ON CONFLICT DO NOTHING;
  UPDATE public.matches SET passed = true WHERE user_id = _me AND matched_user_id = _target;
END; $$;

-- Compatibility computation
CREATE OR REPLACE FUNCTION public.compute_compatibility(_a uuid, _b uuid)
RETURNS TABLE(overall int, communication int, lifestyle int, values_score int, goals int,
  strengths text[], friction text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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

  IF s_goals    >= 80 THEN _strengths := _strengths || 'Aligned relationship goals'; END IF;
  IF s_values   >= 80 THEN _strengths := _strengths || 'Shared core values'; END IF;
  IF s_comm     >= 80 THEN _strengths := _strengths || 'Compatible communication styles'; END IF;
  IF s_lifestyle>= 80 THEN _strengths := _strengths || 'Similar lifestyle rhythms'; END IF;
  IF ja->>'intent'  = jb->>'intent'  AND ja->>'intent' IS NOT NULL  THEN _strengths := _strengths || 'Both want the same kind of relationship'; END IF;
  IF ja->>'horizon' = jb->>'horizon' AND ja->>'horizon' IS NOT NULL THEN _strengths := _strengths || 'Same 3-year vision'; END IF;

  IF s_goals    < 60 THEN _friction := _friction || 'Different relationship goals'; END IF;
  IF s_values   < 60 THEN _friction := _friction || 'Diverging core values'; END IF;
  IF s_comm     < 60 THEN _friction := _friction || 'Different communication styles'; END IF;
  IF ja->>'speed' IS NOT NULL AND jb->>'speed' IS NOT NULL AND ja->>'speed' <> jb->>'speed'
    THEN _friction := _friction || 'Different paces of commitment'; END IF;
  IF ja->>'home'  IS NOT NULL AND jb->>'home'  IS NOT NULL AND ja->>'home'  <> jb->>'home'
    THEN _friction := _friction || 'Different home environments'; END IF;

  RETURN QUERY SELECT s_overall, s_comm, s_lifestyle, s_values, s_goals, _strengths, _friction;
END; $$;

-- Replace discover_profiles
DROP FUNCTION IF EXISTS public.discover_profiles(integer,integer,boolean,text,text,text,integer,integer);
CREATE FUNCTION public.discover_profiles(
  _limit integer DEFAULT 30, _radius_km integer DEFAULT NULL, _nearby_only boolean DEFAULT false,
  _country text DEFAULT NULL, _language text DEFAULT NULL, _intent text DEFAULT NULL,
  _age_min integer DEFAULT NULL, _age_max integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid, first_name text, age integer, city text, gender text, intention text, interested_in text,
  bio text, archetype text, photo_url text, photo_reveal_stage reveal_stage,
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
         s.bio, s.archetype, s.photo_url, s.photo_reveal_stage,
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

-- like_profile: populate compatibility_score
CREATE OR REPLACE FUNCTION public.like_profile(_target uuid)
 RETURNS TABLE(match_id uuid, mutual boolean, conversation_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  _me uuid := auth.uid();
  _their_row public.matches%ROWTYPE;
  _my_id uuid; _conv uuid; _mutual boolean := false;
  _a uuid; _b uuid; _score int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN RAISE EXCEPTION 'cannot like self'; END IF;

  SELECT overall INTO _score FROM public.compute_compatibility(_me, _target);

  INSERT INTO public.matches (user_id, matched_user_id, user_interested, mutual_interest, compatibility_score)
  VALUES (_me, _target, true, false, COALESCE(_score, 60))
  ON CONFLICT DO NOTHING;

  UPDATE public.matches SET user_interested = true,
    compatibility_score = COALESCE(_score, compatibility_score)
   WHERE user_id = _me AND matched_user_id = _target
   RETURNING id INTO _my_id;

  SELECT * INTO _their_row FROM public.matches
   WHERE user_id = _target AND matched_user_id = _me LIMIT 1;

  IF FOUND AND COALESCE(_their_row.user_interested, false) THEN
    _mutual := true;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true WHERE id = _my_id;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true WHERE id = _their_row.id;
    _a := LEAST(_me, _target); _b := GREATEST(_me, _target);
    SELECT id INTO _conv FROM public.conversations WHERE user_a = _a AND user_b = _b LIMIT 1;
    IF _conv IS NULL THEN
      INSERT INTO public.conversations (user_a, user_b) VALUES (_a, _b) RETURNING id INTO _conv;
    END IF;
  END IF;

  RETURN QUERY SELECT _my_id, _mutual, _conv;
END; $function$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
