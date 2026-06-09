
-- 1. Add duration column for voice/audio messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- 2. Voice-messages bucket RLS: only conversation participants can read/insert
DROP POLICY IF EXISTS "voice_msg_select" ON storage.objects;
DROP POLICY IF EXISTS "voice_msg_insert" ON storage.objects;
DROP POLICY IF EXISTS "voice_msg_delete" ON storage.objects;

CREATE POLICY "voice_msg_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

CREATE POLICY "voice_msg_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

CREATE POLICY "voice_msg_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3. Membership quota update:
--    Free  = 15 interactions / 24h
--    Premium = 30 interactions / 24h (was unlimited)
CREATE OR REPLACE FUNCTION public.enforce_message_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _premium boolean;
  _used int;
  _reset timestamptz;
  _limit int;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  _premium := public.user_has_unlimited_messaging(NEW.sender_id);

  SELECT * INTO p FROM public.profiles WHERE id = NEW.sender_id FOR UPDATE;
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;

  _limit := CASE WHEN _premium THEN 30 ELSE 15 END;

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
$$;

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
SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  _premium boolean;
  _used int;
  _reset timestamptz;
  _limit int;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _uid;
  _premium := public.user_has_unlimited_messaging(_uid);
  _reset := COALESCE(p.daily_message_reset_at, now());
  IF _reset + interval '24 hours' <= now() THEN
    _used := 0; _reset := now();
  ELSE
    _used := COALESCE(p.daily_message_count, 0);
  END IF;
  _limit := CASE WHEN _premium THEN 30 ELSE 15 END;
  RETURN QUERY SELECT
    _limit, _used, GREATEST(0, _limit - _used),
    _reset + interval '24 hours',
    false,  -- no longer "unlimited" — capped at 30
    p.premium_until, p.message_pass_until;
END;
$$;
