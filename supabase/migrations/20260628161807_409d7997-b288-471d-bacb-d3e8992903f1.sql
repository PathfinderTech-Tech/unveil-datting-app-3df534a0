
-- RLS policies for chat-attachments bucket
-- Path convention: <conversation_id>/<sender_id>/<filename>
-- Upload: sender must be auth.uid() and a participant of the conversation
-- Read: either participant of the conversation can read

CREATE POLICY "chat_attach_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "chat_attach_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);

CREATE POLICY "chat_attach_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
