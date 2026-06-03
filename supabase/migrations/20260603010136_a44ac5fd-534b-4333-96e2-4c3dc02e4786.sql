
CREATE POLICY "verif_read_own_or_admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );

CREATE POLICY "verif_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "verif_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "verif_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
