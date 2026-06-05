
CREATE OR REPLACE FUNCTION public.user_has_unlimited_messaging(_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid
      AND (
        (p.premium_until IS NOT NULL AND p.premium_until > now())
        OR (p.message_pass_until IS NOT NULL AND p.message_pass_until > now())
      )
  ) OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _uid
      AND s.tier <> 'free'
      AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$function$;
