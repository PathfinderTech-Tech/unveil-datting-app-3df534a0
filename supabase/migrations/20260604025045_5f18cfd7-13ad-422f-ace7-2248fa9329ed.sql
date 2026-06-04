
-- 1. Remove direct INSERT on thoughts; rely on send_thought() SECURITY DEFINER RPC
DROP POLICY IF EXISTS thoughts_insert_self ON public.thoughts;

-- 2. Explicit deny for direct writes to account_deletion_attempts
--    (log_deletion_attempt is SECURITY DEFINER and bypasses RLS as owner)
DROP POLICY IF EXISTS ada_no_direct_insert ON public.account_deletion_attempts;
DROP POLICY IF EXISTS ada_no_direct_update ON public.account_deletion_attempts;
DROP POLICY IF EXISTS ada_no_direct_delete ON public.account_deletion_attempts;

CREATE POLICY ada_no_direct_insert ON public.account_deletion_attempts
  AS RESTRICTIVE FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY ada_no_direct_update ON public.account_deletion_attempts
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon
  USING (false);

CREATE POLICY ada_no_direct_delete ON public.account_deletion_attempts
  AS RESTRICTIVE FOR DELETE TO authenticated, anon
  USING (false);
