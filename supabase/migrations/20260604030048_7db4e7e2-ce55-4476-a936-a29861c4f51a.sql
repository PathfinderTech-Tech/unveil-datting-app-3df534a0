-- Storage RLS for now-private profile-photos bucket.
-- Read = owner OR mutual match (parallels voice_prompts model).
CREATE POLICY "profile_photos_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photos_select_matched"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE COALESCE(m.mutual_interest, false) = true
        AND (
          (m.user_id = auth.uid() AND (m.matched_user_id)::text = (storage.foldername(objects.name))[1])
          OR
          (m.matched_user_id = auth.uid() AND (m.user_id)::text = (storage.foldername(objects.name))[1])
        )
    )
  );

CREATE POLICY "profile_photos_select_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
  );