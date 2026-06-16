
DROP POLICY IF EXISTS matches_update_own ON public.matches;

CREATE POLICY matches_update_own ON public.matches
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = matched_user_id)
WITH CHECK (
  (auth.uid() = user_id OR auth.uid() = matched_user_id)
  -- immutable fields
  AND user_id          = (SELECT m.user_id          FROM public.matches m WHERE m.id = matches.id)
  AND matched_user_id  = (SELECT m.matched_user_id  FROM public.matches m WHERE m.id = matches.id)
  AND created_at       = (SELECT m.created_at       FROM public.matches m WHERE m.id = matches.id)
  AND mutual_interest  = (SELECT m.mutual_interest  FROM public.matches m WHERE m.id = matches.id)
  AND share_unlocked   = (SELECT m.share_unlocked   FROM public.matches m WHERE m.id = matches.id)
  AND compatibility_score = (SELECT m.compatibility_score FROM public.matches m WHERE m.id = matches.id)
  AND chemistry_score     = (SELECT m.chemistry_score     FROM public.matches m WHERE m.id = matches.id)
  AND connection_score    = (SELECT m.connection_score    FROM public.matches m WHERE m.id = matches.id)
  AND interaction_count   = (SELECT m.interaction_count   FROM public.matches m WHERE m.id = matches.id)
  -- only the row's user_id may change user-side fields; matched_user_id side must leave them untouched
  AND (
    auth.uid() = user_id
    OR (
      user_interested      IS NOT DISTINCT FROM (SELECT m.user_interested      FROM public.matches m WHERE m.id = matches.id)
      AND share_user_consent IS NOT DISTINCT FROM (SELECT m.share_user_consent FROM public.matches m WHERE m.id = matches.id)
      AND saved              IS NOT DISTINCT FROM (SELECT m.saved              FROM public.matches m WHERE m.id = matches.id)
      AND passed             IS NOT DISTINCT FROM (SELECT m.passed             FROM public.matches m WHERE m.id = matches.id)
    )
  )
  -- only the row's matched_user_id may change matched-side fields
  AND (
    auth.uid() = matched_user_id
    OR (
      matched_user_interested IS NOT DISTINCT FROM (SELECT m.matched_user_interested FROM public.matches m WHERE m.id = matches.id)
      AND share_matched_consent IS NOT DISTINCT FROM (SELECT m.share_matched_consent FROM public.matches m WHERE m.id = matches.id)
    )
  )
);
