
-- Fix 1: challenge_results — restrict DELETE to owner only
DROP POLICY IF EXISTS chal_own ON public.challenge_results;

CREATE POLICY chal_own_select ON public.challenge_results
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY chal_own_insert ON public.challenge_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY chal_own_update ON public.challenge_results
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = partner_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY chal_own_delete ON public.challenge_results
  FOR DELETE USING (auth.uid() = user_id);

-- Fix 2: verification_requests — prevent self status/reviewer_notes updates
CREATE OR REPLACE FUNCTION public.verification_requests_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Only reviewers can modify verification review fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_requests_guard_update_trg ON public.verification_requests;
CREATE TRIGGER verification_requests_guard_update_trg
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.verification_requests_guard_update();
