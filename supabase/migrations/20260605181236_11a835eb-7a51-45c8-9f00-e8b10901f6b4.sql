
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR current_setting('app.allow_profiles_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.verified            IS DISTINCT FROM OLD.verified
  OR NEW.badge_paid          IS DISTINCT FROM OLD.badge_paid
  OR NEW.trust_score         IS DISTINCT FROM OLD.trust_score
  OR NEW.subscription_tier   IS DISTINCT FROM OLD.subscription_tier
  OR NEW.premium_until       IS DISTINCT FROM OLD.premium_until
  OR NEW.message_pass_until  IS DISTINCT FROM OLD.message_pass_until
  OR NEW.beta_member         IS DISTINCT FROM OLD.beta_member
  OR NEW.readiness_score     IS DISTINCT FROM OLD.readiness_score
  OR NEW.readiness_breakdown IS DISTINCT FROM OLD.readiness_breakdown
  OR NEW.daily_message_count IS DISTINCT FROM OLD.daily_message_count
  OR NEW.daily_message_reset_at IS DISTINCT FROM OLD.daily_message_reset_at
  THEN
    RAISE EXCEPTION 'Field not user-editable on profiles; managed by payment/verification flow';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_message_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  _unlimited := public.user_has_unlimited_messaging(NEW.sender_id);
  IF _unlimited THEN RETURN NEW; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  IF _used >= 15 THEN
    RAISE EXCEPTION 'DAILY_MESSAGE_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.allow_profiles_managed_update', 'true', true);
  UPDATE public.profiles
     SET daily_message_count = _used + 1,
         daily_message_reset_at = _reset,
         updated_at = now()
   WHERE id = NEW.sender_id;
  RETURN NEW;
END; $function$;
