
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS travel_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS travel_warning_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_claimed_country_code text,
  ADD COLUMN IF NOT EXISTS account_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_restricted_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_restricted_reason text;

-- Protect new managed fields
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
  OR NEW.verified_country_code IS DISTINCT FROM OLD.verified_country_code
  OR NEW.trust_level         IS DISTINCT FROM OLD.trust_level
  OR NEW.location_risk_score IS DISTINCT FROM OLD.location_risk_score
  OR NEW.location_mismatch_count IS DISTINCT FROM OLD.location_mismatch_count
  OR NEW.travel_verified_at  IS DISTINCT FROM OLD.travel_verified_at
  OR NEW.travel_expires_at   IS DISTINCT FROM OLD.travel_expires_at
  OR NEW.travel_warning_count IS DISTINCT FROM OLD.travel_warning_count
  OR NEW.travel_claimed_country_code IS DISTINCT FROM OLD.travel_claimed_country_code
  OR NEW.account_restricted  IS DISTINCT FROM OLD.account_restricted
  OR NEW.account_restricted_at IS DISTINCT FROM OLD.account_restricted_at
  OR NEW.account_restricted_reason IS DISTINCT FROM OLD.account_restricted_reason
  THEN
    RAISE EXCEPTION 'Field not user-editable on profiles; managed by payment/verification flow';
  END IF;
  RETURN NEW;
END; $function$;

-- Verified travel activation
CREATE OR REPLACE FUNCTION public.start_verified_travel(
  _claimed_country_code text,
  _claimed_country_name text,
  _device_country_code text,
  _gps_country_code text,
  _ip_country_code text,
  _device_timezone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _claimed text := upper(coalesce(_claimed_country_code,''));
  _signals text[];
  _matches int := 0;
  _present int := 0;
  _match boolean;
  _warnings int;
  _restrict boolean := false;
  _home text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _claimed = '' THEN RAISE EXCEPTION 'claimed country required'; END IF;

  SELECT home_country_code INTO _home FROM public.profiles WHERE id = _uid;

  _signals := ARRAY(
    SELECT upper(s) FROM unnest(ARRAY[_device_country_code, _gps_country_code, _ip_country_code]) s
    WHERE s IS NOT NULL AND s <> ''
  );
  _present := COALESCE(array_length(_signals,1), 0);
  IF _present > 0 THEN
    SELECT count(*) INTO _matches FROM unnest(_signals) s WHERE s = _claimed;
  END IF;
  _match := _present > 0 AND _matches >= 1;

  INSERT INTO public.location_verifications (
    user_id, profile_country_code, current_country_code, device_country_code,
    device_timezone, ip_country_code, gps_country_code, match_result, risk_level,
    vpn_suspected, user_confirmed_traveling, verified_at
  ) VALUES (
    _uid, _home, _claimed,
    NULLIF(upper(coalesce(_device_country_code,'')), ''),
    _device_timezone,
    NULLIF(upper(coalesce(_ip_country_code,'')), ''),
    NULLIF(upper(coalesce(_gps_country_code,'')), ''),
    CASE WHEN _match THEN 'match' WHEN _present=0 THEN 'partial' ELSE 'mismatch' END,
    CASE WHEN _match THEN 'low' WHEN _present=0 THEN 'medium' ELSE 'high' END,
    false, true, now()
  );

  PERFORM set_config('app.allow_profiles_managed_update', 'true', true);

  IF _match THEN
    UPDATE public.profiles SET
      current_country_code = _claimed,
      current_country_name = _claimed_country_name,
      travel_status = 'travelling',
      travel_started_at = COALESCE(travel_started_at, now()),
      travel_verified_at = now(),
      travel_expires_at = now() + interval '14 days',
      travel_claimed_country_code = _claimed,
      verified_country_code = _claimed,
      location_mismatch_count = 0,
      updated_at = now()
    WHERE id = _uid;
    RETURN jsonb_build_object(
      'ok', true, 'verified', true,
      'expires_at', (now() + interval '14 days'),
      'warning_count', 0, 'restricted', false
    );
  ELSE
    SELECT COALESCE(travel_warning_count,0) + 1 INTO _warnings FROM public.profiles WHERE id = _uid;
    IF _warnings >= 2 THEN _restrict := true; END IF;
    UPDATE public.profiles SET
      travel_warning_count = _warnings,
      account_restricted = CASE WHEN _restrict THEN true ELSE account_restricted END,
      account_restricted_at = CASE WHEN _restrict AND account_restricted_at IS NULL THEN now() ELSE account_restricted_at END,
      account_restricted_reason = CASE WHEN _restrict THEN 'location_trust_failed' ELSE account_restricted_reason END,
      location_mismatch_count = COALESCE(location_mismatch_count,0) + 1,
      updated_at = now()
    WHERE id = _uid;
    RETURN jsonb_build_object(
      'ok', true, 'verified', false,
      'warning_count', _warnings, 'restricted', _restrict
    );
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.start_verified_travel(text,text,text,text,text,text) TO authenticated;

-- Enforce account restriction in messaging
CREATE OR REPLACE FUNCTION public.enforce_message_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  _limit int;
  _used int;
  _reset timestamptz;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.sender_id AND account_restricted = true) THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED' USING ERRCODE = 'P0001';
  END IF;

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
$function$;

-- Enforce account restriction in liking
CREATE OR REPLACE FUNCTION public.like_profile(_target uuid)
 RETURNS TABLE(match_id uuid, mutual boolean, conversation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _their_row public.matches%ROWTYPE;
  _my_id uuid; _conv uuid; _mutual boolean := false;
  _a uuid; _b uuid; _score int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN RAISE EXCEPTION 'cannot like self'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _me AND account_restricted = true) THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

  SELECT overall INTO _score FROM public.compute_compatibility(_me, _target);

  INSERT INTO public.matches (user_id, matched_user_id, user_interested, mutual_interest, compatibility_score)
  VALUES (_me, _target, true, false, COALESCE(_score, 60))
  ON CONFLICT DO NOTHING;

  UPDATE public.matches SET user_interested = true,
    compatibility_score = COALESCE(_score, compatibility_score)
   WHERE user_id = _me AND matched_user_id = _target
   RETURNING id INTO _my_id;

  SELECT * INTO _their_row FROM public.matches
   WHERE user_id = _target AND matched_user_id = _me LIMIT 1;

  IF FOUND AND COALESCE(_their_row.user_interested, false) THEN
    _mutual := true;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true WHERE id = _my_id;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true WHERE id = _their_row.id;
    _a := LEAST(_me, _target); _b := GREATEST(_me, _target);
    SELECT id INTO _conv FROM public.conversations WHERE user_a = _a AND user_b = _b LIMIT 1;
    IF _conv IS NULL THEN
      INSERT INTO public.conversations (user_a, user_b) VALUES (_a, _b) RETURNING id INTO _conv;
    END IF;
  END IF;

  RETURN QUERY SELECT _my_id, _mutual, _conv;
END; $function$;
