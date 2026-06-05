
-- ============================================================
-- 1) Tiered message quota: 5 free / 15 verified / unlimited premium
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_message_quota(_uid uuid DEFAULT auth.uid())
RETURNS TABLE(daily_limit integer, used integer, remaining integer, resets_at timestamp with time zone, unlimited boolean, premium_until timestamp with time zone, message_pass_until timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
  _limit int;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid;
  _unlimited := public.user_has_unlimited_messaging(_uid);
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  _limit := CASE WHEN COALESCE(p.verified,false) THEN 15 ELSE 5 END;
  RETURN QUERY SELECT
    _limit,
    _used,
    GREATEST(0, _limit - _used),
    _reset + interval '24 hours',
    _unlimited,
    p.premium_until,
    p.message_pass_until;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_message_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
  _limit int;
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
  _limit := CASE WHEN COALESCE(p.verified,false) THEN 15 ELSE 5 END;
  IF _used >= _limit THEN
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

-- ============================================================
-- 2) Contact-sharing eligibility + content guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_share_contacts(_a uuid, _b uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _a_verified boolean := false;
  _b_verified boolean := false;
  _a_premium boolean := false;
  _b_premium boolean := false;
  _mutual boolean := false;
  _match_created timestamptz;
  _day7 boolean := false;
BEGIN
  SELECT COALESCE(verified,false) INTO _a_verified FROM public.profiles WHERE id = _a;
  SELECT COALESCE(verified,false) INTO _b_verified FROM public.profiles WHERE id = _b;
  IF NOT (_a_verified AND _b_verified) THEN RETURN false; END IF;

  SELECT COALESCE(BOOL_OR(mutual_interest),false), MIN(created_at)
    INTO _mutual, _match_created
    FROM public.matches
   WHERE (user_id = _a AND matched_user_id = _b)
      OR (user_id = _b AND matched_user_id = _a);
  IF NOT _mutual THEN RETURN false; END IF;

  _a_premium := public.user_has_unlimited_messaging(_a);
  _b_premium := public.user_has_unlimited_messaging(_b);
  _day7 := _match_created IS NOT NULL AND _match_created <= now() - interval '7 days';

  RETURN _day7 OR _a_premium OR _b_premium;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_contact_sharing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _peer uuid;
  _content text := COALESCE(NEW.content,'');
  _has_pii boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.message_type = 'thought' THEN RETURN NEW; END IF;

  -- detect phone / email / url / social handles
  IF _content ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN _has_pii := true; END IF;
  IF _content ~* '(?:\+?\d[\s().-]*){7,}\d' THEN _has_pii := true; END IF;
  IF _content ~* '(https?://|www\.)[a-z0-9.-]+' THEN _has_pii := true; END IF;
  IF _content ~* '\b(?:instagram|insta|ig|whatsapp|wa|telegram|tg|snapchat|snap|facebook|fb|tiktok|twitter|x\.com)\b[\s:@/]*[a-z0-9._-]+' THEN _has_pii := true; END IF;
  IF _content ~ '(^|\s)@[A-Za-z0-9._]{3,}' THEN _has_pii := true; END IF;
  IF _content ~* '(wa\.me/|t\.me/|instagram\.com/|fb\.com/|facebook\.com/|snapchat\.com/)' THEN _has_pii := true; END IF;

  IF NOT _has_pii THEN RETURN NEW; END IF;

  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END
    INTO _peer
    FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF _peer IS NULL THEN RETURN NEW; END IF;

  IF public.can_share_contacts(NEW.sender_id, _peer) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'CONTACT_SHARING_LOCKED' USING ERRCODE = 'P0001',
    HINT = 'Contact sharing unlocks after trust milestones have been completed.';
END;
$function$;

DROP TRIGGER IF EXISTS messages_enforce_contact_sharing ON public.messages;
CREATE TRIGGER messages_enforce_contact_sharing
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_sharing();
