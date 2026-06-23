
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS reveal_celebration_seen_at timestamptz;

ALTER TABLE public.matches DISABLE TRIGGER USER;
UPDATE public.matches
   SET reveal_celebration_seen_at = COALESCE(veil_lifted_at, now())
 WHERE veil_lifted_at IS NOT NULL
   AND reveal_celebration_seen_at IS NULL;
ALTER TABLE public.matches ENABLE TRIGGER USER;

-- Allow the match owner to mark their celebration as seen via an RPC.
CREATE OR REPLACE FUNCTION public.mark_reveal_celebration_seen(_peer uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.matches
     SET reveal_celebration_seen_at = COALESCE(reveal_celebration_seen_at, now())
   WHERE user_id = auth.uid()
     AND matched_user_id = _peer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_reveal_celebration_seen(uuid) TO authenticated;
