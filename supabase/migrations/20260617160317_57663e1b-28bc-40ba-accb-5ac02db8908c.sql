
-- 1) Backfill legacy mutual matches that pre-date the veil_lifted_at column.
SET LOCAL app.allow_matches_managed_update = 'true';
UPDATE public.matches
   SET veil_lifted_at = COALESCE(veil_lifted_at, created_at)
 WHERE mutual_interest = true AND veil_lifted_at IS NULL;

-- 2) Tighten "shared activity" — require a real pairing per activity type.
CREATE OR REPLACE FUNCTION public.matches_progress_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := NEW.user_id;
  _tbl text := TG_TABLE_NAME;
  r record;
  _peer_has boolean;
BEGIN
  PERFORM set_config('app.allow_matches_managed_update', 'true', true);
  FOR r IN
    SELECT CASE WHEN m.user_id = _uid THEN m.matched_user_id ELSE m.user_id END AS peer_id
      FROM public.matches m
     WHERE m.mutual_interest = true AND (m.user_id = _uid OR m.matched_user_id = _uid)
  LOOP
    _peer_has := false;

    IF _tbl = 'challenge_results' THEN
      -- A shared challenge means both partners agreed on this very row.
      IF NEW.partner_id = r.peer_id AND COALESCE(NEW.both_agree, false) = true THEN
        _peer_has := true;
      END IF;

    ELSIF _tbl = 'puzzle_scores' THEN
      -- Same puzzle completed by the peer.
      _peer_has := EXISTS (
        SELECT 1 FROM public.puzzle_scores
         WHERE user_id = r.peer_id AND puzzle_id = NEW.puzzle_id
      );

    ELSIF _tbl = 'game_results' THEN
      -- Same game archetype completed by the peer.
      _peer_has := EXISTS (
        SELECT 1 FROM public.game_results
         WHERE user_id = r.peer_id
           AND archetype IS NOT DISTINCT FROM NEW.archetype
      );
    END IF;

    IF _peer_has THEN
      UPDATE public.matches
         SET shared_activity_count = shared_activity_count + 1
       WHERE (user_id = _uid AND matched_user_id = r.peer_id)
          OR (user_id = r.peer_id AND matched_user_id = _uid);
      PERFORM public.reveal_recheck_pair(_uid, r.peer_id);
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;

-- 3) Stop spam-by-repetition. Move dedup into the message trigger so the
--    immutable text helper can stay pure.
CREATE OR REPLACE FUNCTION public.matches_progress_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _a uuid; _b uuid;
  _is_voice boolean := (NEW.message_type = 'voice');
  _is_meaningful boolean;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _last_a date; _last_b date;
  _norm text;
  _prev_norm text;
BEGIN
  IF NEW.message_type IN ('thought','gift','system') THEN RETURN NEW; END IF;

  IF _is_voice THEN
    _is_meaningful := true;
  ELSE
    _is_meaningful := public.fn_is_meaningful_text(NEW.content);
    IF _is_meaningful THEN
      -- Normalize: lowercase, strip non-alnum, collapse.
      _norm := lower(regexp_replace(COALESCE(NEW.content,''), '[^[:alnum:]]', '', 'g'));
      SELECT lower(regexp_replace(COALESCE(content,''), '[^[:alnum:]]', '', 'g'))
        INTO _prev_norm
        FROM public.messages
       WHERE conversation_id = NEW.conversation_id
         AND sender_id = NEW.sender_id
         AND id <> NEW.id
         AND message_type NOT IN ('thought','gift','system','voice')
       ORDER BY created_at DESC
       LIMIT 1;
      IF _prev_norm IS NOT NULL AND _prev_norm = _norm THEN
        _is_meaningful := false;  -- duplicate of the sender's last text
      END IF;
    END IF;
  END IF;

  IF NOT _is_meaningful THEN RETURN NEW; END IF;

  SELECT user_a, user_b INTO _a, _b FROM public.conversations WHERE id = NEW.conversation_id;
  IF _a IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.allow_matches_managed_update', 'true', true);

  SELECT last_active_day INTO _last_a FROM public.matches WHERE user_id = _a AND matched_user_id = _b;
  SELECT last_active_day INTO _last_b FROM public.matches WHERE user_id = _b AND matched_user_id = _a;

  UPDATE public.matches SET
    meaningful_interactions = meaningful_interactions + 1,
    voice_notes_user = voice_notes_user + (CASE WHEN _is_voice AND NEW.sender_id = user_id THEN 1 ELSE 0 END),
    voice_notes_peer = voice_notes_peer + (CASE WHEN _is_voice AND NEW.sender_id = matched_user_id THEN 1 ELSE 0 END),
    active_day_count = active_day_count + (CASE WHEN last_active_day IS DISTINCT FROM _today THEN 1 ELSE 0 END),
    last_active_day = _today
  WHERE (user_id = _a AND matched_user_id = _b)
     OR (user_id = _b AND matched_user_id = _a);

  PERFORM public.reveal_recheck_pair(_a, _b);
  RETURN NEW;
END $function$;
