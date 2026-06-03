
-- 1. Profile privilege escalation guard
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.verified            IS DISTINCT FROM OLD.verified
  OR NEW.badge_paid          IS DISTINCT FROM OLD.badge_paid
  OR NEW.trust_score         IS DISTINCT FROM OLD.trust_score
  OR NEW.subscription_tier   IS DISTINCT FROM OLD.subscription_tier
  OR NEW.premium_until       IS DISTINCT FROM OLD.premium_until
  OR NEW.message_pass_until  IS DISTINCT FROM OLD.message_pass_until
  OR NEW.beta_member         IS DISTINCT FROM OLD.beta_member
  OR NEW.readiness_score     IS DISTINCT FROM OLD.readiness_score
  OR NEW.readiness_breakdown IS DISTINCT FROM OLD.readiness_breakdown
  OR NEW.daily_message_count IS DISTINCT FROM OLD.daily_message_count
  OR NEW.daily_message_reset_at IS DISTINCT FROM OLD.daily_message_reset_at
  THEN
    RAISE EXCEPTION 'Field not user-editable on profiles; managed by payment/verification flow';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

-- 2. shared_contacts: require mutual match
DROP POLICY IF EXISTS share_select_either ON public.shared_contacts;
CREATE POLICY share_select_either ON public.shared_contacts
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (
    auth.uid() = matched_user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE COALESCE(m.mutual_interest,false) = true
        AND ((m.user_id = shared_contacts.user_id AND m.matched_user_id = shared_contacts.matched_user_id)
          OR (m.user_id = shared_contacts.matched_user_id AND m.matched_user_id = shared_contacts.user_id))
    )
  )
);

-- 3. matches: add restrictive WITH CHECK to defend in depth (trigger already enforces)
-- (Trigger matches_guard_update already blocks tampering; no policy change needed beyond ensuring trigger exists.)
DROP TRIGGER IF EXISTS matches_guard_update ON public.matches;
CREATE TRIGGER matches_guard_update
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.matches_guard_update();

-- 4. puzzle_content: explicit deny for anon
DROP POLICY IF EXISTS puzzle_content_no_anon ON public.puzzle_content;
CREATE POLICY puzzle_content_no_anon ON public.puzzle_content
FOR SELECT TO anon USING (false);
REVOKE ALL ON public.puzzle_content FROM anon;

-- 5. puzzles table: ensure RLS denies all direct access (answers only via RPC)
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS puzzles_no_direct_access ON public.puzzles;
CREATE POLICY puzzles_no_direct_access ON public.puzzles
FOR SELECT TO anon, authenticated USING (false);
REVOKE ALL ON public.puzzles FROM anon, authenticated;
GRANT ALL ON public.puzzles TO service_role;
