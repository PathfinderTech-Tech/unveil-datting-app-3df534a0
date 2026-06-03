
-- ============ daily_questions ============
CREATE TABLE public.daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('relationship','values','personality')),
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  weight int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_questions TO authenticated;
GRANT ALL ON public.daily_questions TO service_role;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dq_read_auth ON public.daily_questions FOR SELECT TO authenticated USING (active = true);

-- ============ daily_answers ============
CREATE TABLE public.daily_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  day_key date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_answers TO authenticated;
GRANT ALL ON public.daily_answers TO service_role;
ALTER TABLE public.daily_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY da_own ON public.daily_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_daily_answers_user ON public.daily_answers(user_id, day_key DESC);

-- ============ personality_blueprint ============
CREATE TABLE public.personality_blueprint (
  user_id uuid PRIMARY KEY,
  communication_style text,
  attachment_style text,
  conflict_style text,
  relationship_style text,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personality_blueprint TO authenticated;
GRANT ALL ON public.personality_blueprint TO service_role;
ALTER TABLE public.personality_blueprint ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_own ON public.personality_blueprint FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY pb_matched_read ON public.personality_blueprint FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE COALESCE(m.mutual_interest,false) = true
      AND (((m.user_id = auth.uid()) AND (m.matched_user_id = personality_blueprint.user_id))
        OR ((m.matched_user_id = auth.uid()) AND (m.user_id = personality_blueprint.user_id)))
  ));

-- ============ reveal_progress ============
CREATE TABLE public.reveal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  day int NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reveal_progress TO authenticated;
GRANT ALL ON public.reveal_progress TO service_role;
ALTER TABLE public.reveal_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY rp_participant_read ON public.reveal_progress FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = reveal_progress.match_id
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
  ));
CREATE POLICY rp_write_own ON public.reveal_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY rp_update_own ON public.reveal_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ============ profiles columns ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS readiness_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============ compute_readiness_score ============
CREATE OR REPLACE FUNCTION public.compute_readiness_score(_uid uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ans int; _onb int; _bp int;
  _comm int; _commit int; _emo int; _vals int; _goals int; _total int;
  _onb_data jsonb;
BEGIN
  SELECT count(*) INTO _ans FROM public.daily_answers WHERE user_id = _uid;
  SELECT answers INTO _onb_data FROM public.onboarding_answers WHERE user_id = _uid;
  SELECT count(*) FILTER (WHERE communication_style IS NOT NULL)
       + count(*) FILTER (WHERE attachment_style IS NOT NULL)
       + count(*) FILTER (WHERE conflict_style IS NOT NULL)
       + count(*) FILTER (WHERE relationship_style IS NOT NULL)
    INTO _bp FROM public.personality_blueprint WHERE user_id = _uid;

  _onb := CASE WHEN _onb_data IS NULL THEN 0 ELSE 100 END;
  _comm   := LEAST(100, 40 + _ans * 4 + CASE WHEN _bp >= 1 THEN 20 ELSE 0 END);
  _commit := LEAST(100, 40 + _ans * 3 + (CASE WHEN _onb_data->'discover'->>'intent' IS NOT NULL THEN 30 ELSE 0 END));
  _emo    := LEAST(100, 40 + _bp * 12 + _ans * 2);
  _vals   := LEAST(100, 40 + (CASE WHEN _onb_data->'discover'->'politics' IS NOT NULL THEN 20 ELSE 0 END)
                          + (CASE WHEN _onb_data->'discover'->'priorities' IS NOT NULL THEN 20 ELSE 0 END)
                          + _ans * 2);
  _goals  := LEAST(100, 40 + (CASE WHEN _onb_data->'discover'->>'horizon' IS NOT NULL THEN 30 ELSE 0 END)
                          + (CASE WHEN _onb_data->'discover'->>'speed' IS NOT NULL THEN 20 ELSE 0 END)
                          + _ans * 2);
  _total := ROUND(_comm*0.22 + _commit*0.22 + _emo*0.20 + _vals*0.18 + _goals*0.18);

  UPDATE public.profiles SET
    readiness_score = _total,
    readiness_breakdown = jsonb_build_object(
      'communication', _comm, 'commitment', _commit, 'emotional', _emo,
      'values', _vals, 'goals', _goals
    )
  WHERE id = _uid;

  RETURN _total;
END $$;
REVOKE EXECUTE ON FUNCTION public.compute_readiness_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_readiness_score(uuid) TO authenticated, service_role;

-- ============ Seed daily questions ============
INSERT INTO public.daily_questions (category, prompt, options) VALUES
('relationship','What matters most to you in a partner this week?','["Emotional safety","Shared ambition","Playfulness","Independence","Intimacy"]'::jsonb),
('relationship','How do you prefer to resolve disagreements?','["Talk it out immediately","Take time then revisit","Write it down","Seek a neutral view"]'::jsonb),
('relationship','What does commitment look like to you today?','["Daily presence","Shared plans","Public partnership","Building a life together"]'::jsonb),
('relationship','Which love language are you giving most this week?','["Words","Acts","Gifts","Time","Touch"]'::jsonb),
('relationship','How do you want to be supported on a hard day?','["Held silently","Talked through it","Distracted","Given space"]'::jsonb),
('relationship','What is your ideal weekly check-in cadence?','["Daily","2-3 times","Weekly","As-needed"]'::jsonb),
('relationship','Where do you stand on long-distance for the right person?','["Open","Short-term only","Prefer local","No"]'::jsonb),
('relationship','What is a non-negotiable for you right now?','["Honesty","Ambition","Kindness","Curiosity","Stability"]'::jsonb),
('relationship','How important is shared faith or worldview?','["Essential","Important","Helpful","Neutral"]'::jsonb),
('relationship','How quickly do you want to define a relationship?','["Within weeks","2-3 months","6+ months","No timeline"]'::jsonb),
('values','How do you feel about money and partnership?','["Fully combine","Mostly combine","Yours/mine/ours","Fully separate"]'::jsonb),
('values','What''s your stance on children?','["Want","Open","Already have","Prefer not"]'::jsonb),
('values','How much do politics matter in a partner?','["Must align","Mostly align","Open to differences","Doesn''t matter"]'::jsonb),
('values','What role does family play in your life?','["Central","Important","Selective","Independent"]'::jsonb),
('values','How do you weigh ambition vs. presence?','["Mostly ambition","Balanced","Mostly presence","Depends"]'::jsonb),
('values','How do you approach personal growth?','["Therapy / coaching","Books / courses","Community","Solo reflection"]'::jsonb),
('values','Where do you want to be in 5 years?','["Same city, settled","New country","Build a business","Family-focused"]'::jsonb),
('values','How important is health and fitness?','["Daily priority","Several times a week","Casual","Not a focus"]'::jsonb),
('values','How do you feel about social media in a relationship?','["Private","Selective sharing","Open","Public"]'::jsonb),
('values','What is your relationship with alcohol?','["None","Rare","Social","Frequent"]'::jsonb),
('personality','Which feels most true today?','["Reflective","Energized","Restless","Grounded","Playful"]'::jsonb),
('personality','How do you recharge?','["Alone","With a partner","Small group","Big group","Movement"]'::jsonb),
('personality','How do you process big emotions?','["Talk","Write","Move","Sit with them","Distract"]'::jsonb),
('personality','How do you respond to conflict?','["Lean in","Pause","Repair quickly","Need space first"]'::jsonb),
('personality','How would friends describe your humour?','["Dry","Warm","Playful","Sharp","Goofy"]'::jsonb),
('personality','How do you make decisions?','["Gut","Pros / cons","Ask trusted few","Sleep on it"]'::jsonb),
('personality','How do you express care?','["Words","Acts of service","Quality time","Gifts","Touch"]'::jsonb),
('personality','What energizes you in a partner?','["Curiosity","Calm","Drive","Humour","Warmth"]'::jsonb),
('personality','How do you handle uncertainty?','["Plan harder","Sit with it","Talk through it","Move forward anyway"]'::jsonb),
('personality','What''s your social rhythm?','["Mostly home","Few close friends","Mid social","Always out"]'::jsonb);
