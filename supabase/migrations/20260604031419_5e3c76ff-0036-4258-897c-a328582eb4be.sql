-- ============================================================
-- 1. Realtime channel access (defense-in-depth)
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rt_authenticated_chat_topics" ON realtime.messages;
DROP POLICY IF EXISTS "rt_authenticated_chat_topics_write" ON realtime.messages;
DROP POLICY IF EXISTS "rt_anon_deny" ON realtime.messages;

-- Authenticated users may subscribe / read only to topics they own.
-- Topic conventions used in the app:
--   chat-<conversation_uuid>   — only conversation participants
--   inbox-<user_uuid>          — only that user
CREATE POLICY "rt_authenticated_chat_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    topic LIKE 'chat-%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(topic from 6)
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  OR (
    topic LIKE 'inbox-%'
    AND substring(topic from 7) = auth.uid()::text
  )
);

-- Mirror policy for INSERT (Broadcast publish path) so a user can only
-- publish to a topic they're allowed to listen to.
CREATE POLICY "rt_authenticated_chat_topics_write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    topic LIKE 'chat-%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(topic from 6)
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  OR (
    topic LIKE 'inbox-%'
    AND substring(topic from 7) = auth.uid()::text
  )
);

-- Explicit deny for anon (no anonymous Realtime subscriptions anywhere).
CREATE POLICY "rt_anon_deny"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ============================================================
-- 2. reveal_progress — require match participation on writes
-- ============================================================
DROP POLICY IF EXISTS "rp_write_own" ON public.reveal_progress;
DROP POLICY IF EXISTS "rp_update_own" ON public.reveal_progress;

CREATE POLICY "rp_write_own"
ON public.reveal_progress
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = reveal_progress.match_id
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
      AND COALESCE(m.mutual_interest, false) = true
  )
);

CREATE POLICY "rp_update_own"
ON public.reveal_progress
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = reveal_progress.match_id
      AND (m.user_id = auth.uid() OR m.matched_user_id = auth.uid())
      AND COALESCE(m.mutual_interest, false) = true
  )
);
