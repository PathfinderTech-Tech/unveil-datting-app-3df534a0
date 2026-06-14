
CREATE OR REPLACE FUNCTION public.matches_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' OR current_setting('app.allow_matches_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.matched_user_id IS DISTINCT FROM OLD.matched_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.mutual_interest IS DISTINCT FROM OLD.mutual_interest
     OR NEW.share_unlocked IS DISTINCT FROM OLD.share_unlocked
     OR NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score
     OR NEW.chemistry_score IS DISTINCT FROM OLD.chemistry_score
     OR NEW.connection_score IS DISTINCT FROM OLD.connection_score
     OR NEW.interaction_count IS DISTINCT FROM OLD.interaction_count
  THEN
    RAISE EXCEPTION 'Field not user-editable on matches; use security-definer RPCs';
  END IF;
  IF _uid = OLD.user_id THEN
    IF NEW.matched_user_interested IS DISTINCT FROM OLD.matched_user_interested
       OR NEW.share_matched_consent IS DISTINCT FROM OLD.share_matched_consent
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSIF _uid = OLD.matched_user_id THEN
    IF NEW.user_interested IS DISTINCT FROM OLD.user_interested
       OR NEW.share_user_consent IS DISTINCT FROM OLD.share_user_consent
       OR NEW.passed IS DISTINCT FROM OLD.passed
       OR NEW.saved IS DISTINCT FROM OLD.saved
    THEN RAISE EXCEPTION 'Cannot modify other party fields on matches'; END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;
  RETURN NEW;
END; $function$;

SET LOCAL app.allow_matches_managed_update = 'true';

UPDATE public.matches
SET matched_user_interested = true,
    mutual_interest = true
WHERE id = '247b05e5-0696-4c70-8f0d-00a6d5c296c3'
  AND user_id = '98ee0509-3840-473a-82ae-42c43cd6a7bf'
  AND matched_user_id = '51516469-1dfc-4559-b01e-1afa6890aa85';
