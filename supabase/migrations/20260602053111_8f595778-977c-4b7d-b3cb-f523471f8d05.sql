
-- Challenges
CREATE TABLE public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  question text NOT NULL,
  option_a text,
  option_b text,
  option_c text,
  explanation text,
  difficulty integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenges_cat_active ON public.challenges(category, active);
GRANT SELECT ON public.challenges TO anon, authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read_all" ON public.challenges FOR SELECT TO anon, authenticated USING (active = true);

-- Puzzles
CREATE TABLE public.puzzles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  puzzle text NOT NULL,
  answer text NOT NULL,
  explanation text,
  difficulty integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_puzzles_cat_active ON public.puzzles(category, active);
GRANT SELECT ON public.puzzles TO anon, authenticated;
GRANT ALL ON public.puzzles TO service_role;
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puzzles_read_all" ON public.puzzles FOR SELECT TO anon, authenticated USING (active = true);

-- Completion tracking
CREATE TABLE public.content_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_type text NOT NULL,  -- 'challenge' | 'puzzle'
  content_id uuid NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);
CREATE INDEX idx_completions_user ON public.content_completions(user_id, content_type);
GRANT SELECT, INSERT, DELETE ON public.content_completions TO authenticated;
GRANT ALL ON public.content_completions TO service_role;
ALTER TABLE public.content_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_own" ON public.content_completions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
