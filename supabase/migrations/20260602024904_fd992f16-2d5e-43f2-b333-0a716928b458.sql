-- Discovery + like RPCs for real matching.
-- Returns only safe, non-PII columns; excludes self, blocked users, and people
-- the caller has already expressed interest in.
CREATE OR REPLACE FUNCTION public.discover_profiles(_limit int DEFAULT 30)
RETURNS TABLE (
  id uuid,
  first_name text,
  age int,
  city text,
  gender text,
  intention text,
  interested_in text,
  bio text,
  archetype text,
  photo_url text,
  photo_reveal_stage reveal_stage,
  compatibility_score int,
  curiosity_level int,
  emotional_rhythm jsonb,
  verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.age, p.city, p.gender, p.intention, p.interested_in,
         p.bio, p.archetype, p.photo_url, p.photo_reveal_stage, p.compatibility_score,
         p.curiosity_level, p.emotional_rhythm, p.verified
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND COALESCE(p.onboarding_complete, false) = true
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id      AND b.blocked_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.user_id = auth.uid() AND m.matched_user_id = p.id
    )
  ORDER BY ABS(COALESCE(p.compatibility_score, 0)
               - COALESCE((SELECT compatibility_score FROM public.profiles WHERE id = auth.uid()), 0)) ASC,
           p.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.discover_profiles(int) TO authenticated;

-- Express interest in another profile. Inserts a match row and, if the other
-- side already expressed interest, flips mutual_interest on both rows and
-- opens a conversation.
CREATE OR REPLACE FUNCTION public.like_profile(_target uuid)
RETURNS TABLE (match_id uuid, mutual boolean, conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _their_row public.matches%ROWTYPE;
  _my_id uuid;
  _conv uuid;
  _mutual boolean := false;
  _a uuid;
  _b uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN RAISE EXCEPTION 'cannot like self'; END IF;

  -- Upsert my interest row.
  INSERT INTO public.matches (user_id, matched_user_id, user_interested, mutual_interest)
  VALUES (_me, _target, true, false)
  ON CONFLICT DO NOTHING;

  SELECT id INTO _my_id FROM public.matches
  WHERE user_id = _me AND matched_user_id = _target LIMIT 1;

  IF _my_id IS NULL THEN
    UPDATE public.matches SET user_interested = true
    WHERE user_id = _me AND matched_user_id = _target
    RETURNING id INTO _my_id;
  END IF;

  -- Does the other side already like me?
  SELECT * INTO _their_row FROM public.matches
  WHERE user_id = _target AND matched_user_id = _me LIMIT 1;

  IF FOUND AND COALESCE(_their_row.user_interested, false) THEN
    _mutual := true;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true
      WHERE id = _my_id;
    UPDATE public.matches SET mutual_interest = true, matched_user_interested = true
      WHERE id = _their_row.id;

    _a := LEAST(_me, _target);
    _b := GREATEST(_me, _target);
    SELECT id INTO _conv FROM public.conversations
      WHERE user_a = _a AND user_b = _b LIMIT 1;
    IF _conv IS NULL THEN
      INSERT INTO public.conversations (user_a, user_b)
      VALUES (_a, _b) RETURNING id INTO _conv;
    END IF;
  END IF;

  RETURN QUERY SELECT _my_id, _mutual, _conv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.like_profile(uuid) TO authenticated;