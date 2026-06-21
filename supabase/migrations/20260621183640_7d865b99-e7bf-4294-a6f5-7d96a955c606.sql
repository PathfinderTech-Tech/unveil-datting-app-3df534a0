
-- 1. Usage log
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  token_estimate integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_code text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_log_user_feature_day_idx
  ON public.ai_usage_log (user_id, feature_name, created_at DESC);

GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own AI usage"
  ON public.ai_usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Rate-limit config
CREATE TABLE public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,            -- 'free' | 'two_week_pass' | 'premium_monthly' | 'premium_quarterly' | 'premium_annual'
  feature_name text NOT NULL,    -- 'ai_compatibility_insights' | 'ai_message_advice' | 'ai_icebreakers' | 'ai_date_suggestions'
  daily_limit integer NOT NULL,  -- -1 = unlimited, 0 = blocked
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier, feature_name)
);

GRANT SELECT ON public.ai_rate_limits TO authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed-in can read AI limits"
  ON public.ai_rate_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage AI limits"
  ON public.ai_rate_limits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ai_rate_limits_touch
  BEFORE UPDATE ON public.ai_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed
INSERT INTO public.ai_rate_limits (tier, feature_name, daily_limit) VALUES
  ('free','ai_compatibility_insights',0),
  ('free','ai_message_advice',0),
  ('free','ai_icebreakers',0),
  ('free','ai_date_suggestions',0),
  ('two_week_pass','ai_compatibility_insights',1),
  ('two_week_pass','ai_message_advice',5),
  ('two_week_pass','ai_icebreakers',5),
  ('two_week_pass','ai_date_suggestions',2),
  ('premium_monthly','ai_compatibility_insights',3),
  ('premium_monthly','ai_message_advice',10),
  ('premium_monthly','ai_icebreakers',10),
  ('premium_monthly','ai_date_suggestions',5),
  ('premium_quarterly','ai_compatibility_insights',3),
  ('premium_quarterly','ai_message_advice',10),
  ('premium_quarterly','ai_icebreakers',10),
  ('premium_quarterly','ai_date_suggestions',5),
  ('premium_annual','ai_compatibility_insights',3),
  ('premium_annual','ai_message_advice',10),
  ('premium_annual','ai_icebreakers',10),
  ('premium_annual','ai_date_suggestions',5);

-- 3. Effective tier resolver
CREATE OR REPLACE FUNCTION public.get_ai_tier(_uid uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _pass_active boolean;
  _price text;
BEGIN
  SELECT (message_pass_until IS NOT NULL AND message_pass_until > now())
    INTO _pass_active FROM public.profiles WHERE id = _uid;
  IF COALESCE(_pass_active,false) THEN RETURN 'two_week_pass'; END IF;

  SELECT s.price_id INTO _price
    FROM public.subscriptions s
   WHERE s.user_id = _uid
     AND s.status IN ('active','trialing')
     AND (s.current_period_end IS NULL OR s.current_period_end > now())
   ORDER BY s.created_at DESC LIMIT 1;

  IF _price IN ('premium_monthly','premium_quarterly','premium_annual') THEN RETURN _price; END IF;
  RETURN 'free';
END $$;

-- 4. Rate-limit checker
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(_uid uuid, _feature text)
RETURNS TABLE(allowed boolean, tier text, daily_limit integer, used integer, remaining integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tier text;
  _limit integer;
  _used integer;
BEGIN
  IF public.has_role(_uid,'admin'::app_role) THEN
    RETURN QUERY SELECT true, 'admin'::text, -1, 0, 2147483647; RETURN;
  END IF;
  _tier := public.get_ai_tier(_uid);
  SELECT rl.daily_limit INTO _limit FROM public.ai_rate_limits rl
   WHERE rl.tier = _tier AND rl.feature_name = _feature;
  IF _limit IS NULL THEN _limit := 0; END IF;
  IF _limit = -1 THEN
    RETURN QUERY SELECT true, _tier, -1, 0, 2147483647; RETURN;
  END IF;
  SELECT count(*)::int INTO _used FROM public.ai_usage_log
   WHERE user_id = _uid AND feature_name = _feature
     AND success = true
     AND created_at > now() - interval '24 hours';
  RETURN QUERY SELECT (_used < _limit), _tier, _limit, _used, GREATEST(0,_limit-_used);
END $$;
