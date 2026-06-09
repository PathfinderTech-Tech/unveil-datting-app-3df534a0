
-- Effective daily interaction limit. Returns -1 for unlimited.
CREATE OR REPLACE FUNCTION public.get_effective_message_limit(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pass_active boolean;
  _price text;
BEGIN
  -- Daily Pass overrides everything
  SELECT (message_pass_until IS NOT NULL AND message_pass_until > now())
    INTO _pass_active
  FROM public.profiles WHERE id = _uid;
  IF COALESCE(_pass_active, false) THEN
    RETURN -1;
  END IF;

  -- Look up active subscription's price_id
  SELECT s.price_id INTO _price
  FROM public.subscriptions s
  WHERE s.user_id = _uid
    AND s.status IN ('active','trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF _price IN ('premium_quarterly', 'premium_annual') THEN
    RETURN -1;
  ELSIF _price = 'premium_monthly' THEN
    RETURN 30;
  ELSE
    RETURN 15;
  END IF;
END;
$$;

-- Keep legacy helper but route through new logic
CREATE OR REPLACE FUNCTION public.user_has_unlimited_messaging(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_effective_message_limit(_uid) = -1;
$$;

-- Quota readout for client
CREATE OR REPLACE FUNCTION public.get_message_quota(_uid uuid DEFAULT auth.uid())
RETURNS TABLE(
  daily_limit integer,
  used integer,
  remaining integer,
  resets_at timestamptz,
  unlimited boolean,
  premium_until timestamptz,
  message_pass_until timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _limit int;
  _used int;
  _reset timestamptz;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid;
  _limit := public.get_effective_message_limit(_uid);
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  RETURN QUERY SELECT
    _limit,
    _used,
    CASE WHEN _limit = -1 THEN 2147483647 ELSE GREATEST(0, _limit - _used) END,
    _reset + interval '24 hours',
    (_limit = -1),
    p.premium_until,
    p.message_pass_until;
END;
$$;

-- Trigger that enforces the per-plan cap on every messages insert
CREATE OR REPLACE FUNCTION public.enforce_message_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _limit int;
  _used int;
  _reset timestamptz;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  _limit := public.get_effective_message_limit(NEW.sender_id);

  SELECT * INTO p FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;

  IF _limit <> -1 AND _used >= _limit THEN
    RAISE EXCEPTION 'DAILY_MESSAGE_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.allow_profiles_managed_update', 'true', true);
  UPDATE public.profiles
     SET daily_message_count = _used + 1,
         daily_message_reset_at = _reset,
         updated_at = now()
   WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$;
