CREATE OR REPLACE FUNCTION public.get_effective_message_limit(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pass_active boolean;
  _price text;
BEGIN
  -- Active message pass (24h or 2w) overrides everything
  SELECT (message_pass_until IS NOT NULL AND message_pass_until > now())
    INTO _pass_active
  FROM public.profiles WHERE id = _uid;
  IF COALESCE(_pass_active, false) THEN
    RETURN -1;
  END IF;

  -- Active premium subscription -> unlimited for all billing periods
  SELECT s.price_id INTO _price
  FROM public.subscriptions s
  WHERE s.user_id = _uid
    AND s.status IN ('active','trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF _price IN ('premium_monthly', 'premium_quarterly', 'premium_annual') THEN
    RETURN -1;
  END IF;

  -- Flat free-tier limit: 15 messages & voice notes per 24h for all free users
  RETURN 15;
END;
$function$;