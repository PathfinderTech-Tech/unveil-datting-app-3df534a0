
-- 1) Puzzles: stop exposing answer to clients. Revoke direct SELECT and serve via RPCs.
REVOKE SELECT ON public.puzzles FROM anon, authenticated;
DROP POLICY IF EXISTS puzzles_read_auth ON public.puzzles;

CREATE OR REPLACE FUNCTION public.get_puzzle_round(_category text, _limit int DEFAULT 5)
RETURNS TABLE(id uuid, category text, puzzle text, difficulty int, options jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  RETURN QUERY
  WITH picked AS (
    SELECT p.id, p.category, p.puzzle, p.difficulty, p.answer
    FROM public.puzzles p
    WHERE p.active = true AND (_category IS NULL OR p.category = _category)
    ORDER BY random()
    LIMIT GREATEST(1, LEAST(_limit, 20))
  ),
  pool AS (
    SELECT DISTINCT p.answer FROM public.puzzles p
    WHERE p.active = true AND (_category IS NULL OR p.category = _category)
  )
  SELECT pk.id, pk.category, pk.puzzle, pk.difficulty,
    (
      SELECT to_jsonb(array_agg(opt ORDER BY random()))
      FROM (
        SELECT pk.answer AS opt
        UNION
        SELECT answer FROM pool WHERE answer <> pk.answer ORDER BY random() LIMIT 3
      ) o
    ) AS options
  FROM picked pk;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_puzzle(_id uuid, _pick text)
RETURNS TABLE(correct boolean, answer text, explanation text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _ans text; _exp text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT p.answer, p.explanation INTO _ans, _exp FROM public.puzzles p WHERE p.id = _id AND p.active = true;
  IF _ans IS NULL THEN RAISE EXCEPTION 'puzzle not found'; END IF;
  RETURN QUERY SELECT (_pick = _ans), _ans, _exp;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_puzzle_round(text,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_puzzle(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_puzzle_round(text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_puzzle(uuid,text) TO authenticated;

-- 2) date_plans: allow either party to delete
CREATE POLICY date_plans_delete_either ON public.date_plans
  FOR DELETE TO authenticated
  USING (auth.uid() = proposer_id OR auth.uid() = invitee_id);

-- 3) first_impression_responses: require mutual match
DROP POLICY IF EXISTS fi_select_matched ON public.first_impression_responses;
CREATE POLICY fi_select_matched ON public.first_impression_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE COALESCE(m.mutual_interest, false) = true
      AND (
        (m.user_id = auth.uid() AND m.matched_user_id = first_impression_responses.user_id)
        OR (m.matched_user_id = auth.uid() AND m.user_id = first_impression_responses.user_id)
      )
  ));

-- 4) voice_prompts: require mutual match
DROP POLICY IF EXISTS voice_select_matched ON public.voice_prompts;
CREATE POLICY voice_select_matched ON public.voice_prompts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE COALESCE(m.mutual_interest, false) = true
      AND (
        (m.user_id = auth.uid() AND m.matched_user_id = voice_prompts.user_id)
        OR (m.matched_user_id = auth.uid() AND m.user_id = voice_prompts.user_id)
      )
  ));

-- 5) voice-prompts storage: allow mutually matched users to read audio
CREATE POLICY voice_prompts_select_matched ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-prompts'
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE COALESCE(m.mutual_interest, false) = true
        AND (
          (m.user_id = auth.uid() AND m.matched_user_id::text = (storage.foldername(name))[1])
          OR (m.matched_user_id = auth.uid() AND m.user_id::text = (storage.foldername(name))[1])
        )
    )
  );

-- 6) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.pass_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.discover_profiles(int,int,boolean,text,text,text,int,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_monetization_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_unlimited_messaging(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profile_axes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.discover_hidden_matches(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_message_quota(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_why_we_match(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_compatibility(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.like_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consent_share_contact(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_readiness_score(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_email_approved(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.pass_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_profiles(int,int,boolean,text,text,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_unlimited_messaging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_axes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_hidden_matches(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_why_we_match(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_compatibility(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consent_share_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_readiness_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_approved(text) TO authenticated;
-- admin_monetization_stats stays restricted to service_role only
