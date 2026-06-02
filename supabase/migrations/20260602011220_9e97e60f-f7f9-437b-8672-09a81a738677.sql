
-- Spark answers
CREATE TABLE public.spark_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spark_answers TO authenticated;
GRANT ALL ON public.spark_answers TO service_role;
ALTER TABLE public.spark_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY spark_own ON public.spark_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_spark_answers_user ON public.spark_answers(user_id, created_at DESC);

-- Puzzle scores (best per puzzle)
CREATE TABLE public.puzzle_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  puzzle_id text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, puzzle_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.puzzle_scores TO authenticated;
GRANT ALL ON public.puzzle_scores TO service_role;
ALTER TABLE public.puzzle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY puzzle_own ON public.puzzle_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Challenge results
CREATE TABLE public.challenge_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  reward text,
  payment text,
  both_agree boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_results TO authenticated;
GRANT ALL ON public.challenge_results TO service_role;
ALTER TABLE public.challenge_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY chal_own ON public.challenge_results FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chal_user ON public.challenge_results(user_id, created_at DESC);

-- Badges earned
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY badges_own ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY badges_insert_own ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
