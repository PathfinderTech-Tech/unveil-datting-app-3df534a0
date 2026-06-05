
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS photo_reveal_user_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_reveal_matched_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_reveal_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_reveal_unlocked_at timestamptz;

-- Block direct user edits of these fields; only the RPC may set them.
CREATE OR REPLACE FUNCTION public.matches_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.matched_user_id IS DISTINCT FROM OLD.matched_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reveal_stage IS DISTINCT FROM OLD.reveal_stage
     OR NEW.mutual_interest IS DISTINCT FROM OLD.mutual_interest
     OR NEW.share_unlocked IS DISTINCT FROM OLD.share_unlocked
     OR NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score
     OR NEW.chemistry_score IS DISTINCT FROM OLD.chemistry_score
     OR NEW.connection_score IS DISTINCT FROM OLD.connection_score
     OR NEW.interaction_count IS DISTINCT FROM OLD.interaction_count
     OR NEW.photo_reveal_user_consent IS DISTINCT FROM OLD.photo_reveal_user_consent
     OR NEW.photo_reveal_matched_consent IS DISTINCT FROM OLD.photo_reveal_matched_consent
     OR NEW.photo_reveal_unlocked IS DISTINCT FROM OLD.photo_reveal_unlocked
     OR NEW.photo_reveal_unlocked_at IS DISTINCT FROM OLD.photo_reveal_unlocked_at
  THEN
    RAISE EXCEPTION 'Field not user-editable on matches; use security-definer RPCs';
  END IF;
  IF _uid = OLD.user_id THEN
    IF NEW.matched_user_interested IS DISTINCT FROM OLD.matched_user_interested
       OR NEW.share_matched_consent IS DISTINCT FROM OLD.share_matched_consent
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSIF _uid = OLD.matched_user_id THEN
    IF NEW.user_interested IS DISTINCT FROM OLD.user_interested
       OR NEW.share_user_consent IS DISTINCT FROM OLD.share_user_consent
       OR NEW.passed IS DISTINCT FROM OLD.passed
       OR NEW.saved IS DISTINCT FROM OLD.saved
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;
  RETURN NEW;
END; $function$;

-- Mutual photo reveal opt-in. Requires mutual match + both verified.
CREATE OR REPLACE FUNCTION public.consent_photo_reveal(_match_user uuid)
 RETURNS TABLE(unlocked boolean, you_consented boolean, they_consented boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _mutual boolean := false;
  _me_verified boolean := false;
  _peer_verified boolean := false;
  _both boolean := false;
  _you boolean := false;
  _they boolean := false;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _match_user THEN RAISE EXCEPTION 'cannot reveal to self'; END IF;

  SELECT COALESCE(BOOL_OR(mutual_interest), false) INTO _mutual
    FROM public.matches
   WHERE (user_id = _me AND matched_user_id = _match_user)
      OR (user_id = _match_user AND matched_user_id = _me);
  IF NOT _mutual THEN
    RAISE EXCEPTION 'Photo reveal requires a mutual match' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(verified,false) INTO _me_verified   FROM public.profiles WHERE id = _me;
  SELECT COALESCE(verified,false) INTO _peer_verified FROM public.profiles WHERE id = _match_user;
  IF NOT _me_verified OR NOT _peer_verified THEN
    RAISE EXCEPTION 'Both profiles must be verified to unlock photos' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.matches SET photo_reveal_user_consent = true
   WHERE user_id = _me AND matched_user_id = _match_user;
  UPDATE public.matches SET photo_reveal_matched_consent = true
   WHERE user_id = _match_user AND matched_user_id = _me;

  SELECT COALESCE((SELECT photo_reveal_user_consent FROM public.matches
                    WHERE user_id = _me AND matched_user_id = _match_user), false),
         COALESCE((SELECT photo_reveal_user_consent FROM public.matches
                    WHERE user_id = _match_user AND matched_user_id = _me), false)
    INTO _you, _they;

  _both := _you AND _they;
  IF _both THEN
    UPDATE public.matches
       SET photo_reveal_unlocked = true,
           photo_reveal_unlocked_at = COALESCE(photo_reveal_unlocked_at, now())
     WHERE (user_id = _me AND matched_user_id = _match_user)
        OR (user_id = _match_user AND matched_user_id = _me);
  END IF;

  RETURN QUERY SELECT _both, _you, _they;
END; $function$;

-- Status read for a pair.
CREATE OR REPLACE FUNCTION public.get_photo_reveal_status(_match_user uuid)
 RETURNS TABLE(mutual boolean, you_verified boolean, they_verified boolean,
               you_consented boolean, they_consented boolean,
               unlocked boolean, peer_photo_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _mutual boolean := false;
  _you boolean := false;
  _they boolean := false;
  _unlocked boolean := false;
  _me_v boolean := false;
  _peer_v boolean := false;
  _photo text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT COALESCE(BOOL_OR(mutual_interest), false),
         COALESCE(BOOL_OR(photo_reveal_unlocked), false)
    INTO _mutual, _unlocked
    FROM public.matches
   WHERE (user_id = _me AND matched_user_id = _match_user)
      OR (user_id = _match_user AND matched_user_id = _me);

  SELECT COALESCE(photo_reveal_user_consent,false) INTO _you
    FROM public.matches WHERE user_id = _me AND matched_user_id = _match_user;
  SELECT COALESCE(photo_reveal_user_consent,false) INTO _they
    FROM public.matches WHERE user_id = _match_user AND matched_user_id = _me;

  SELECT COALESCE(verified,false) INTO _me_v   FROM public.profiles WHERE id = _me;
  SELECT COALESCE(verified,false) INTO _peer_v FROM public.profiles WHERE id = _match_user;

  IF _unlocked THEN
    SELECT profile_photo_url INTO _photo FROM public.profiles WHERE id = _match_user;
    IF _photo IS NULL OR _photo = '' THEN
      SELECT photo_url INTO _photo FROM public.profiles WHERE id = _match_user;
    END IF;
  END IF;

  RETURN QUERY SELECT _mutual, _me_v, _peer_v,
                      COALESCE(_you,false), COALESCE(_they,false),
                      _unlocked, _photo;
END; $function$;

GRANT EXECUTE ON FUNCTION public.consent_photo_reveal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_photo_reveal_status(uuid) TO authenticated;
