ALTER POLICY "matches_update_own" ON public.matches TO authenticated;
ALTER POLICY "chal_own_select" ON public.challenge_results TO authenticated;
ALTER POLICY "chal_own_insert" ON public.challenge_results TO authenticated;
ALTER POLICY "chal_own_update" ON public.challenge_results TO authenticated;
ALTER POLICY "chal_own_delete" ON public.challenge_results TO authenticated;

DROP POLICY IF EXISTS "Anyone signed-in can read AI limits" ON public.ai_rate_limits;
CREATE POLICY "Admins can read AI limits" ON public.ai_rate_limits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.ai_rate_limits FROM anon;