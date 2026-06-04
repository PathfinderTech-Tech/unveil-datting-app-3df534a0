
CREATE TABLE public.guided_date_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guided_date_progress TO authenticated;
GRANT ALL ON public.guided_date_progress TO service_role;
ALTER TABLE public.guided_date_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY gdp_own ON public.guided_date_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.values_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  completion_count integer NOT NULL DEFAULT 0,
  last_completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.values_challenge_progress TO authenticated;
GRANT ALL ON public.values_challenge_progress TO service_role;
ALTER TABLE public.values_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY vcp_own ON public.values_challenge_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
