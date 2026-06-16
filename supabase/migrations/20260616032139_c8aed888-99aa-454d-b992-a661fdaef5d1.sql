CREATE TABLE public.ai_compatibility_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_user_id uuid NOT NULL,
  payload jsonb NOT NULL,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  inputs_signature text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_compatibility_insights TO authenticated;
GRANT ALL ON public.ai_compatibility_insights TO service_role;

ALTER TABLE public.ai_compatibility_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ai insights"
  ON public.ai_compatibility_insights FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ai insights"
  ON public.ai_compatibility_insights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai insights"
  ON public.ai_compatibility_insights FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own ai insights"
  ON public.ai_compatibility_insights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX ai_compatibility_insights_user_idx ON public.ai_compatibility_insights (user_id, computed_at DESC);

CREATE OR REPLACE FUNCTION public.ai_insights_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER ai_insights_set_updated_at
  BEFORE UPDATE ON public.ai_compatibility_insights
  FOR EACH ROW EXECUTE FUNCTION public.ai_insights_touch_updated_at();