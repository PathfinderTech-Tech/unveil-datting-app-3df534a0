
DROP POLICY IF EXISTS reads_insert ON public.message_reads;
CREATE POLICY reads_insert ON public.message_reads
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reads.message_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

DROP POLICY IF EXISTS typing_write ON public.typing_indicators;
CREATE POLICY typing_write ON public.typing_indicators
FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = typing_indicators.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = typing_indicators.conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);
