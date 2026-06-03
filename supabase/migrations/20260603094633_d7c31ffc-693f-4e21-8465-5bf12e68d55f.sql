
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_message_reset_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS message_pass_until timestamptz;

-- Helper: does this user currently have unlimited messaging?
CREATE OR REPLACE FUNCTION public.user_has_unlimited_messaging(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
      AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

-- Quota inspector (callable from client)
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid;
  _unlimited := public.user_has_unlimited_messaging(_uid);
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0;
    _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  RETURN QUERY SELECT
    15,
    _used,
    GREATEST(0, 15 - _used),
    _reset + interval '24 hours',
    _unlimited,
    p.premium_until,
    p.message_pass_until;
END;
$$;

-- Trigger: enforce daily limit on messages INSERT and bump counter
CREATE OR REPLACE FUNCTION public.enforce_message_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _unlimited boolean;
  _used int;
  _reset timestamptz;
BEGIN
  -- Service role bypass (webhooks, admin)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  _unlimited := public.user_has_unlimited_messaging(NEW.sender_id);
  IF _unlimited THEN
    RETURN NEW;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  _reset := COALESCE(p.daily_message_reset_at, now());

  IF _reset + interval '24 hours' <= now() THEN
    _used := 0;
    _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;

  IF _used >= 15 THEN
    RAISE EXCEPTION 'DAILY_MESSAGE_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles
     SET daily_message_count = _used + 1,
         daily_message_reset_at = _reset,
         updated_at = now()
   WHERE id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_quota ON public.messages;
CREATE TRIGGER trg_enforce_message_quota
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_message_quota();

-- Admin analytics helper
CREATE OR REPLACE FUNCTION public.admin_monetization_stats()
RETURNS TABLE(
  messages_today bigint,
  daily_passes_today bigint,
  active_message_passes bigint,
  active_premium_subs bigint,
  verified_badges bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.messages WHERE created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM public.transactions
       WHERE kind = 'message_pass_24h' AND status = 'succeeded'
         AND created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM public.profiles WHERE message_pass_until > now()),
    (SELECT count(*) FROM public.subscriptions
       WHERE status IN ('active','trialing')
         AND (current_period_end IS NULL OR current_period_end > now())),
    (SELECT count(*) FROM public.profiles WHERE badge_paid = true);
$$;

GRANT EXECUTE ON FUNCTION public.get_message_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_unlimited_messaging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_monetization_stats() TO authenticated;
