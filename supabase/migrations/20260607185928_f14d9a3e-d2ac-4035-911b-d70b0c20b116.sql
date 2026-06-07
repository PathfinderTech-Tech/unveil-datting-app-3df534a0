DROP POLICY IF EXISTS rp_participant_read ON public.reveal_progress;
CREATE POLICY rp_participant_read ON public.reveal_progress
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = reveal_progress.match_id
      AND COALESCE(m.mutual_interest, false) = true
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
  ));