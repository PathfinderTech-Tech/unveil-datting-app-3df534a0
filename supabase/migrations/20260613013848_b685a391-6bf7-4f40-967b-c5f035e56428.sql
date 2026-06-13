
-- 1) USER_BADGES: lock writes
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_badges_no_client_insert ON public.user_badges;
DROP POLICY IF EXISTS user_badges_no_client_update ON public.user_badges;
DROP POLICY IF EXISTS user_badges_no_client_delete ON public.user_badges;
CREATE POLICY user_badges_no_client_insert ON public.user_badges FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY user_badges_no_client_update ON public.user_badges FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY user_badges_no_client_delete ON public.user_badges FOR DELETE TO authenticated USING (false);
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM authenticated, anon;
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;

-- 2) MATCHES: defense-in-depth on top of the trigger.
-- Drop and recreate matches_update_own with WITH CHECK that pins immutable fields.
DROP POLICY IF EXISTS matches_update_own ON public.matches;
CREATE POLICY matches_update_own ON public.matches
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR (auth.uid() = matched_user_id))
  WITH CHECK (
    ((auth.uid() = user_id) OR (auth.uid() = matched_user_id))
    -- Only the trigger (with app.allow_matches_managed_update) or service_role
    -- may change these. For client UPDATEs, force them to equal the current row.
    AND mutual_interest         = (SELECT mutual_interest         FROM public.matches m WHERE m.id = matches.id)
    AND share_unlocked          = (SELECT share_unlocked          FROM public.matches m WHERE m.id = matches.id)
    AND compatibility_score     = (SELECT compatibility_score     FROM public.matches m WHERE m.id = matches.id)
    AND chemistry_score         = (SELECT chemistry_score         FROM public.matches m WHERE m.id = matches.id)
    AND connection_score        = (SELECT connection_score        FROM public.matches m WHERE m.id = matches.id)
    AND interaction_count       = (SELECT interaction_count       FROM public.matches m WHERE m.id = matches.id)
    AND user_id                 = (SELECT user_id                 FROM public.matches m WHERE m.id = matches.id)
    AND matched_user_id         = (SELECT matched_user_id         FROM public.matches m WHERE m.id = matches.id)
    AND created_at              = (SELECT created_at              FROM public.matches m WHERE m.id = matches.id)
  );

-- 3) Revoke anon EXECUTE on sensitive functions
REVOKE EXECUTE ON FUNCTION public.set_user_travel_mode(text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_verified_travel(text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_deletion_attempt(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_effective_message_limit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_likes_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_share_contacts(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_email_cooldown(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_email_in_cooldown(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_failure_stats(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_failure_stats(integer) TO authenticated;
-- Triggers should never be callable by clients
REVOKE EXECUTE ON FUNCTION public.enforce_contact_sharing() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_daily_message_count() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.thoughts_guard_update() FROM anon, authenticated, public;

-- 4) Safe match-profile accessor returning only UI-needed fields
CREATE OR REPLACE FUNCTION public.get_public_match_profile(_target uuid)
RETURNS TABLE(
  id uuid, first_name text, age integer, city text, country text,
  gender text, intention text, interested_in text, bio text,
  archetype text, photo_url text, avatar_url text, verified boolean,
  preferred_language text, relationship_intent text,
  curiosity_level integer, emotional_rhythm jsonb,
  location_enabled boolean, location_privacy text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _me uuid := auth.uid(); _mutual boolean := false;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN
    -- own profile: return safe subset
    NULL;
  ELSE
    SELECT COALESCE(BOOL_OR(mutual_interest), false) INTO _mutual
    FROM public.matches
    WHERE (user_id = _me AND matched_user_id = _target)
       OR (user_id = _target AND matched_user_id = _me);
    IF NOT _mutual THEN RAISE EXCEPTION 'not matched'; END IF;
  END IF;
  RETURN QUERY
  SELECT p.id, p.first_name, p.age, p.city, p.country,
         p.gender, p.intention, p.interested_in, p.bio,
         p.archetype, p.photo_url, p.avatar_url, p.verified,
         p.preferred_language, p.relationship_intent,
         p.curiosity_level, p.emotional_rhythm,
         p.location_enabled, p.location_privacy
  FROM public.profiles p WHERE p.id = _target;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_public_match_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_public_match_profile(uuid) TO authenticated;
