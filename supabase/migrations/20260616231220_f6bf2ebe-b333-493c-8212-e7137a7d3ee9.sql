-- Unveil Reveal Journey: business-logic update

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS meaningful_interactions int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_notes_user int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_notes_peer int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS veil_lifted_at timestamptz,
  ADD COLUMN IF NOT EXISTS active_day_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_day date,
  ADD COLUMN IF NOT EXISTS shared_activity_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS date_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS sponsor_preference text
    CHECK (sponsor_preference IS NULL OR sponsor_preference IN ('sponsor','split','decide_together'));

CREATE OR REPLACE FUNCTION public.matches_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' OR current_setting('app.allow_matches_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.matched_user_id IS DISTINCT FROM OLD.matched_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.mutual_interest IS DISTINCT FROM OLD.mutual_interest
     OR NEW.share_unlocked IS DISTINCT FROM OLD.share_unlocked
     OR NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score
     OR NEW.chemistry_score IS DISTINCT FROM OLD.chemistry_score
     OR NEW.connection_score IS DISTINCT FROM OLD.connection_score
     OR NEW.interaction_count IS DISTINCT FROM OLD.interaction_count
     OR NEW.meaningful_interactions IS DISTINCT FROM OLD.meaningful_interactions
     OR NEW.voice_notes_user IS DISTINCT FROM OLD.voice_notes_user
     OR NEW.voice_notes_peer IS DISTINCT FROM OLD.voice_notes_peer
     OR NEW.veil_lifted_at IS DISTINCT FROM OLD.veil_lifted_at
     OR NEW.active_day_count IS DISTINCT FROM OLD.active_day_count
     OR NEW.last_active_day IS DISTINCT FROM OLD.last_active_day
     OR NEW.shared_activity_count IS DISTINCT FROM OLD.shared_activity_count
     OR NEW.date_unlocked_at IS DISTINCT FROM OLD.date_unlocked_at
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
       OR NEW.sponsor_preference IS DISTINCT FROM OLD.sponsor_preference
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.fn_is_meaningful_text(_content text)
 RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $$
DECLARE _stripped text;
BEGIN
  IF _content IS NULL THEN RETURN false; END IF;
  _stripped := regexp_replace(_content, '[^[:alnum:]]', '', 'g');
  RETURN length(_stripped) >= 3;
END $$;

CREATE OR REPLACE FUNCTION public.reveal_recheck_pair(_a uuid, _b uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _meaningful int; _v_a int; _v_b int;
  _veil_at timestamptz; _active_days int; _shared int; _date_at timestamptz;
BEGIN
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

  SELECT MAX(meaningful_interactions), MAX(active_day_count), MAX(shared_activity_count),
         MIN(veil_lifted_at), MIN(date_unlocked_at)
    INTO _meaningful, _active_days, _shared, _veil_at, _date_at
    FROM public.matches
   WHERE (user_id = _a AND matched_user_id = _b)
      OR (user_id = _b AND matched_user_id = _a);

  SELECT voice_notes_user, voice_notes_peer INTO _v_a, _v_b
    FROM public.matches WHERE user_id = _a AND matched_user_id = _b;

  IF _veil_at IS NULL
     AND COALESCE(_meaningful,0) >= 10
     AND COALESCE(_v_a,0) >= 1
     AND COALESCE(_v_b,0) >= 1 THEN
    UPDATE public.matches SET veil_lifted_at = now()
     WHERE ((user_id = _a AND matched_user_id = _b)
         OR (user_id = _b AND matched_user_id = _a))
       AND veil_lifted_at IS NULL;
    _veil_at := now();
  END IF;

  IF _veil_at IS NOT NULL AND _date_at IS NULL
     AND COALESCE(_active_days,0) >= 3
     AND COALESCE(_shared,0) >= 1 THEN
    UPDATE public.matches SET date_unlocked_at = now()
     WHERE ((user_id = _a AND matched_user_id = _b)
         OR (user_id = _b AND matched_user_id = _a))
       AND date_unlocked_at IS NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.matches_progress_on_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _a uuid; _b uuid;
  _is_voice boolean := (NEW.message_type = 'voice');
  _is_meaningful boolean;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _last_a date; _last_b date;
BEGIN
  IF NEW.message_type = 'thought' THEN RETURN NEW; END IF;
  IF _is_voice THEN _is_meaningful := true;
  ELSE _is_meaningful := public.fn_is_meaningful_text(NEW.content); END IF;
  IF NOT _is_meaningful THEN RETURN NEW; END IF;

  SELECT user_a, user_b INTO _a, _b FROM public.conversations WHERE id = NEW.conversation_id;
  IF _a IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

  SELECT last_active_day INTO _last_a FROM public.matches WHERE user_id = _a AND matched_user_id = _b;
  SELECT last_active_day INTO _last_b FROM public.matches WHERE user_id = _b AND matched_user_id = _a;

  UPDATE public.matches SET
    meaningful_interactions = meaningful_interactions + 1,
    voice_notes_user = voice_notes_user + (CASE WHEN _is_voice AND NEW.sender_id = _a THEN 1 ELSE 0 END),
    voice_notes_peer = voice_notes_peer + (CASE WHEN _is_voice AND NEW.sender_id = _b THEN 1 ELSE 0 END),
    last_active_day = _today,
    active_day_count = active_day_count + (CASE WHEN _last_a IS DISTINCT FROM _today THEN 1 ELSE 0 END)
  WHERE user_id = _a AND matched_user_id = _b;

  UPDATE public.matches SET
    meaningful_interactions = meaningful_interactions + 1,
    voice_notes_user = voice_notes_user + (CASE WHEN _is_voice AND NEW.sender_id = _b THEN 1 ELSE 0 END),
    voice_notes_peer = voice_notes_peer + (CASE WHEN _is_voice AND NEW.sender_id = _a THEN 1 ELSE 0 END),
    last_active_day = _today,
    active_day_count = active_day_count + (CASE WHEN _last_b IS DISTINCT FROM _today THEN 1 ELSE 0 END)
  WHERE user_id = _b AND matched_user_id = _a;

  PERFORM public.reveal_recheck_pair(_a, _b);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_matches_progress_on_message ON public.messages;
CREATE TRIGGER trg_matches_progress_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.matches_progress_on_message();

CREATE OR REPLACE FUNCTION public.matches_progress_on_activity()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := NEW.user_id;
  r record;
BEGIN
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);
  FOR r IN
    SELECT CASE WHEN m.user_id = _uid THEN m.matched_user_id ELSE m.user_id END AS peer_id
    FROM public.matches m
    WHERE m.mutual_interest = true AND (m.user_id = _uid OR m.matched_user_id = _uid)
  LOOP
    -- Only count if the peer also has any activity record
    IF EXISTS (SELECT 1 FROM public.game_results WHERE user_id = r.peer_id)
       OR EXISTS (SELECT 1 FROM public.puzzle_scores WHERE user_id = r.peer_id)
       OR EXISTS (SELECT 1 FROM public.challenge_results WHERE user_id = r.peer_id) THEN
      UPDATE public.matches SET shared_activity_count = shared_activity_count + 1
        WHERE (user_id = _uid AND matched_user_id = r.peer_id)
           OR (user_id = r.peer_id AND matched_user_id = _uid);
      PERFORM public.reveal_recheck_pair(_uid, r.peer_id);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_matches_progress_on_game ON public.game_results;
CREATE TRIGGER trg_matches_progress_on_game
AFTER INSERT ON public.game_results
FOR EACH ROW EXECUTE FUNCTION public.matches_progress_on_activity();

DROP TRIGGER IF EXISTS trg_matches_progress_on_puzzle ON public.puzzle_scores;
CREATE TRIGGER trg_matches_progress_on_puzzle
AFTER INSERT ON public.puzzle_scores
FOR EACH ROW EXECUTE FUNCTION public.matches_progress_on_activity();

DROP TRIGGER IF EXISTS trg_matches_progress_on_challenge ON public.challenge_results;
CREATE TRIGGER trg_matches_progress_on_challenge
AFTER INSERT ON public.challenge_results
FOR EACH ROW EXECUTE FUNCTION public.matches_progress_on_activity();

CREATE OR REPLACE FUNCTION public.set_sponsor_preference(_peer uuid, _pref text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _pref IS NOT NULL AND _pref NOT IN ('sponsor','split','decide_together') THEN
    RAISE EXCEPTION 'invalid sponsor preference';
  END IF;
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);
  UPDATE public.matches SET sponsor_preference = _pref
   WHERE user_id = _me AND matched_user_id = _peer;
END $$;

GRANT EXECUTE ON FUNCTION public.set_sponsor_preference(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_recheck_pair(uuid, uuid) TO authenticated;