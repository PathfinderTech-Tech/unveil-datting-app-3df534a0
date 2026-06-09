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
    RETURN 35;
  ELSE
    RETURN 15;
  END IF;
END;
$$;