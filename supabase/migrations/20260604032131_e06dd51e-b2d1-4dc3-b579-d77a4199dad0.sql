
-- Attach existing guard functions as triggers (they were defined but never attached)
DROP TRIGGER IF EXISTS trg_matches_guard_update ON public.matches;
CREATE TRIGGER trg_matches_guard_update
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.matches_guard_update();

DROP TRIGGER IF EXISTS trg_profiles_guard_update ON public.profiles;
CREATE TRIGGER trg_profiles_guard_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

DROP TRIGGER IF EXISTS trg_date_plans_guard_update ON public.date_plans;
CREATE TRIGGER trg_date_plans_guard_update
  BEFORE UPDATE ON public.date_plans
  FOR EACH ROW EXECUTE FUNCTION public.date_plans_guard_update();

-- Thoughts: prevent recipient from rewriting sender's content
CREATE OR REPLACE FUNCTION public.thoughts_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.delivered_as_message_id IS DISTINCT FROM OLD.delivered_as_message_id
  THEN
    RAISE EXCEPTION 'Only read_at is user-editable on thoughts';
  END IF;
  IF auth.uid() <> OLD.recipient_id THEN
    RAISE EXCEPTION 'Only the recipient can mark a thought as read';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_thoughts_guard_update ON public.thoughts;
CREATE TRIGGER trg_thoughts_guard_update
  BEFORE UPDATE ON public.thoughts
  FOR EACH ROW EXECUTE FUNCTION public.thoughts_guard_update();
