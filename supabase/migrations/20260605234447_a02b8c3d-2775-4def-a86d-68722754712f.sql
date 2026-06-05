
DROP POLICY IF EXISTS md3_select_participant ON public.match_day3_answers;
CREATE POLICY md3_select_participant ON public.match_day3_answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_day3_answers.match_id
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
      AND COALESCE(m.mutual_interest, false) = true
  ));

DROP POLICY IF EXISTS mip_select_participant ON public.match_intro_prompts;
CREATE POLICY mip_select_participant ON public.match_intro_prompts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_intro_prompts.match_id
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
      AND COALESCE(m.mutual_interest, false) = true
  ));
