
-- 1) Puzzles: stop anon read of answers
DROP POLICY IF EXISTS puzzles_read_all ON public.puzzles;
CREATE POLICY puzzles_read_auth ON public.puzzles
  FOR SELECT TO authenticated
  USING (active = true);
REVOKE SELECT ON public.puzzles FROM anon;

-- 2) Analytics: cannot spoof user_id
DROP POLICY IF EXISTS ae_insert_anyone ON public.analytics_events;
CREATE POLICY ae_insert_self ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3) Date plans: restrict per-party field updates via trigger
CREATE OR REPLACE FUNCTION public.date_plans_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.proposer_id IS DISTINCT FROM OLD.proposer_id
     OR NEW.invitee_id IS DISTINCT FROM OLD.invitee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Field not user-editable on date_plans';
  END IF;
  -- Invitee may only flip status
  IF _uid = OLD.invitee_id AND _uid <> OLD.proposer_id THEN
    IF NEW.date_type   IS DISTINCT FROM OLD.date_type
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.proposed_at IS DISTINCT FROM OLD.proposed_at
       OR NEW.notes    IS DISTINCT FROM OLD.notes
    THEN
      RAISE EXCEPTION 'Invitee can only update status on a date plan';
    END IF;
  END IF;
  -- Proposer cannot self-accept
  IF _uid = OLD.proposer_id AND _uid <> OLD.invitee_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('accepted','declined')
    THEN
      RAISE EXCEPTION 'Proposer cannot accept or decline their own date plan';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS date_plans_guard_update_trg ON public.date_plans;
CREATE TRIGGER date_plans_guard_update_trg
  BEFORE UPDATE ON public.date_plans
  FOR EACH ROW EXECUTE FUNCTION public.date_plans_guard_update();

-- 4) Profiles: only expose full profile after mutual_interest
DROP POLICY IF EXISTS profiles_select_matched ON public.profiles;
CREATE POLICY profiles_select_matched ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE COALESCE(m.mutual_interest, false) = true
      AND (((m.user_id = auth.uid()) AND (m.matched_user_id = profiles.id))
        OR ((m.matched_user_id = auth.uid()) AND (m.user_id = profiles.id)))
  ));

-- 5) Lock down internal SECURITY DEFINER helpers + pin search_path
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint)               SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb)               SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_approved(text)                  FROM PUBLIC, anon, authenticated;

-- 6) puzzle_content: explicit deny-by-default policy (access only via service role / RPCs)
DROP POLICY IF EXISTS puzzle_content_no_direct_access ON public.puzzle_content;
CREATE POLICY puzzle_content_no_direct_access ON public.puzzle_content
  FOR SELECT TO authenticated
  USING (false);
