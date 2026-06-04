
-- 1. Fix mutable search_path on set_reactivation_allowed_at
CREATE OR REPLACE FUNCTION public.set_reactivation_allowed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.reactivation_allowed_at IS NULL THEN
    NEW.reactivation_allowed_at := COALESCE(NEW.deleted_at, now()) + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Revoke anon/public EXECUTE on functions that should not be callable without auth
REVOKE EXECUTE ON FUNCTION public.send_thought(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.matches_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.date_plans_guard_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_interaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_message_quota() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_reactivation_allowed_at() FROM PUBLIC, anon, authenticated;

-- 3. Harden matches_update_own with WITH CHECK so the policy itself blocks non-participants on the new row
DROP POLICY IF EXISTS matches_update_own ON public.matches;
CREATE POLICY matches_update_own ON public.matches
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- 4. Add explicit INSERT policy on thoughts (defense in depth; primary path is send_thought RPC)
DROP POLICY IF EXISTS thoughts_insert_self ON public.thoughts;
CREATE POLICY thoughts_insert_self ON public.thoughts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() <> recipient_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = recipient_id AND b.blocked_id = sender_id)
         OR (b.blocker_id = sender_id   AND b.blocked_id = recipient_id)
    )
  );
