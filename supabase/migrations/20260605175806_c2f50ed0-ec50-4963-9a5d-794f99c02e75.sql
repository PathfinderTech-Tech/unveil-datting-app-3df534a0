CREATE OR REPLACE FUNCTION public.matches_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' OR current_setting('app.allow_matches_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
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
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

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

CREATE OR REPLACE FUNCTION public.consent_share_contact(_match_user uuid)
 RETURNS TABLE(unlocked boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _both boolean := false;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

  UPDATE public.matches SET share_user_consent = true
   WHERE user_id = _me AND matched_user_id = _match_user;
  UPDATE public.matches SET share_matched_consent = true
   WHERE user_id = _match_user AND matched_user_id = _me;

  SELECT (
    (SELECT COALESCE(share_user_consent,false) FROM public.matches WHERE user_id = _me AND matched_user_id = _match_user)
    AND
    (SELECT COALESCE(share_user_consent,false) FROM public.matches WHERE user_id = _match_user AND matched_user_id = _me)
  ) INTO _both;

  IF _both THEN
    UPDATE public.matches SET share_unlocked = true
     WHERE (user_id = _me AND matched_user_id = _match_user)
        OR (user_id = _match_user AND matched_user_id = _me);
  END IF;

  RETURN QUERY SELECT _both;
END; $function$;

CREATE OR REPLACE FUNCTION public.bump_match_interaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a uuid; _b uuid;
BEGIN
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);
  SELECT user_a, user_b INTO _a, _b FROM public.conversations WHERE id = NEW.conversation_id;
  IF _a IS NULL THEN RETURN NEW; END IF;
  UPDATE public.matches SET
    interaction_count = COALESCE(interaction_count,0) + 1,
    chemistry_score = LEAST(100, COALESCE(chemistry_score,0) + 1),
    connection_score = LEAST(100, COALESCE(connection_score,0) + 1)
  WHERE (user_id IN (_a,_b) AND matched_user_id IN (_a,_b));
  RETURN NEW;
END; $function$;