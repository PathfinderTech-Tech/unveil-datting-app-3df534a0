-- Phone OTP rate limiting (send / verify abuse protection).
-- Keys are stored as hashes only — never raw phone numbers or IPs.

CREATE TABLE IF NOT EXISTS public.otp_rate_events (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_rate_events_bucket_key_created_idx
  ON public.otp_rate_events (bucket, key_hash, created_at DESC);

ALTER TABLE public.otp_rate_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.otp_rate_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.otp_rate_events_id_seq TO service_role;

-- No policies for anon/authenticated → blocked by RLS.
-- service_role bypasses RLS.

CREATE OR REPLACE FUNCTION public.consume_otp_rate_limit(
  _bucket text,
  _key_hash text,
  _max_count integer,
  _window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _used integer;
  _oldest timestamptz;
  _retry integer;
BEGIN
  IF _bucket IS NULL OR length(_bucket) = 0
     OR _key_hash IS NULL OR length(_key_hash) < 8
     OR _max_count IS NULL OR _max_count < 1
     OR _window_seconds IS NULL OR _window_seconds < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_seconds', 60, 'used', 0, 'error', 'invalid_args');
  END IF;

  -- Drop expired rows for this key (keeps table small).
  DELETE FROM public.otp_rate_events
   WHERE bucket = _bucket
     AND key_hash = _key_hash
     AND created_at < now() - make_interval(secs => _window_seconds);

  SELECT count(*)::integer, min(created_at)
    INTO _used, _oldest
    FROM public.otp_rate_events
   WHERE bucket = _bucket
     AND key_hash = _key_hash
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF _used >= _max_count THEN
    _retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (_oldest + make_interval(secs => _window_seconds) - now())))::integer
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', _retry,
      'used', _used
    );
  END IF;

  INSERT INTO public.otp_rate_events (bucket, key_hash)
  VALUES (_bucket, _key_hash);

  RETURN jsonb_build_object(
    'allowed', true,
    'retry_after_seconds', 0,
    'used', _used + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_otp_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_otp_rate_limit(text, text, integer, integer)
  TO service_role;
