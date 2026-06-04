
-- Day 1 mutual prompt exchange
CREATE TABLE public.match_intro_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  prompt_1 text,
  prompt_2 text,
  prompt_3 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.match_intro_prompts TO authenticated;
GRANT ALL ON public.match_intro_prompts TO service_role;
ALTER TABLE public.match_intro_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mip_insert_own ON public.match_intro_prompts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_intro_prompts.match_id
        AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
    )
  );

CREATE POLICY mip_select_participant ON public.match_intro_prompts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_intro_prompts.match_id
        AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
    )
  );

-- No update policy: answers cannot be edited after submission (per spec).

-- Day 3 shared challenge answers
CREATE TABLE public.match_day3_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT, INSERT ON public.match_day3_answers TO authenticated;
GRANT ALL ON public.match_day3_answers TO service_role;
ALTER TABLE public.match_day3_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY md3_insert_own ON public.match_day3_answers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_day3_answers.match_id
        AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
    )
  );

CREATE POLICY md3_select_participant ON public.match_day3_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_day3_answers.match_id
        AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
    )
  );
