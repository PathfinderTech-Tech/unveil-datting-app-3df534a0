
DROP POLICY IF EXISTS matches_select_own ON public.matches;

CREATE POLICY matches_select_own_side ON public.matches
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.uid() = matched_user_id AND COALESCE(mutual_interest, false) = true)
  );

CREATE OR REPLACE FUNCTION public.get_pending_likes_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(count(*)::int, 0)
  FROM public.matches
  WHERE matched_user_id = auth.uid()
    AND COALESCE(user_interested, false) = true
    AND COALESCE(mutual_interest, false) = false
    AND COALESCE(passed, false) = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_likes_count() TO authenticated;
