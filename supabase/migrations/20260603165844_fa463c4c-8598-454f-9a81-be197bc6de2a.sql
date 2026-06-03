
-- 1. Remove direct INSERT on matches; only SECURITY DEFINER RPCs (like_profile/pass_profile) may create rows
DROP POLICY IF EXISTS matches_insert_own ON public.matches;

-- 2. Tighten date_plans INSERT: proposer must have a mutual match with invitee
DROP POLICY IF EXISTS date_plans_insert ON public.date_plans;
CREATE POLICY date_plans_insert ON public.date_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = proposer_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE COALESCE(m.mutual_interest, false) = true
        AND ((m.user_id = proposer_id AND m.matched_user_id = invitee_id)
          OR (m.user_id = invitee_id  AND m.matched_user_id = proposer_id))
    )
  );

-- 3. Revoke EXECUTE from anon and PUBLIC on every SECURITY DEFINER function in public schema.
-- Authenticated-only execution for user-callable RPCs.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant to authenticated only for user-facing RPCs.
GRANT EXECUTE ON FUNCTION public.like_profile(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.pass_profile(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.consent_share_contact(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_profiles(integer, integer, boolean, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discover_hidden_matches(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_compatibility(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_why_we_match(uuid, uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_readiness_score(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_axes(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_puzzle_round(text, integer)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_puzzle(uuid, text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_quota(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_unlimited_messaging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_approved(text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_monetization_stats()        TO authenticated;

-- 4. Remove duplicate storage policies (keep canonical *_own set, drop short-name duplicates)
DROP POLICY IF EXISTS pp_insert ON storage.objects;
DROP POLICY IF EXISTS pp_update ON storage.objects;
DROP POLICY IF EXISTS pp_delete ON storage.objects;
DROP POLICY IF EXISTS vp_insert ON storage.objects;
DROP POLICY IF EXISTS vp_delete ON storage.objects;
DROP POLICY IF EXISTS vp_read_own ON storage.objects;
