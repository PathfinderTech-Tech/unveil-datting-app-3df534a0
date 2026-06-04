
-- 1. Column-level UPDATE privileges on matches (defense alongside guard trigger)
REVOKE UPDATE ON public.matches FROM authenticated;
GRANT UPDATE (
  user_interested,
  matched_user_interested,
  share_user_consent,
  share_matched_consent,
  passed,
  saved
) ON public.matches TO authenticated;

-- 2. Realtime: restrictive allow-list of topic patterns
DROP POLICY IF EXISTS rt_restrict_topics ON realtime.messages;
CREATE POLICY rt_restrict_topics ON realtime.messages
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (topic LIKE 'chat-%' OR topic LIKE 'inbox-%')
  WITH CHECK (topic LIKE 'chat-%' OR topic LIKE 'inbox-%');
