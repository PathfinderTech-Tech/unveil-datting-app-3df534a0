CREATE OR REPLACE FUNCTION public.get_message_quota(_uid uuid DEFAULT auth.uid())
RETURNS TABLE(daily_limit integer, used integer, remaining integer, resets_at timestamp with time zone, unlimited boolean, premium_until timestamp with time zone, message_pass_until timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
  _limit int;
  _is_premium boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid;
  _unlimited := public.user_has_unlimited_messaging(_uid);
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  _is_premium := (p.subscription_tier = 'premium' AND (p.premium_until IS NULL OR p.premium_until > now()));
  _limit := CASE WHEN _is_premium THEN 15 ELSE 5 END;
  RETURN QUERY SELECT
    _limit, _used, GREATEST(0, _limit - _used),
    _reset + interval '24 hours',
    _unlimited, p.premium_until, p.message_pass_until;
END;
$$;

-- Update increment trigger limit logic too
CREATE OR REPLACE FUNCTION public.increment_daily_message_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _used int; _reset timestamptz; _limit int; _is_premium boolean;
BEGIN
  IF public.user_has_unlimited_messaging(NEW.sender_id) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = NEW.sender_id;
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  _is_premium := (p.subscription_tier = 'premium' AND (p.premium_until IS NULL OR p.premium_until > now()));
  _limit := CASE WHEN _is_premium THEN 15 ELSE 5 END;
  IF _used >= _limit THEN
    RAISE EXCEPTION 'daily_message_limit_reached' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.profiles
    SET daily_message_count = _used + 1,
        daily_message_reset_at = _reset,
        updated_at = now()
    WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$;