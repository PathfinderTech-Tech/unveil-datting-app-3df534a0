-- profile-photos: public read, owner write/delete (folder = user id)
DO $$ BEGIN
  DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
  DROP POLICY IF EXISTS "profile_photos_insert_own" ON storage.objects;
  DROP POLICY IF EXISTS "profile_photos_update_own" ON storage.objects;
  DROP POLICY IF EXISTS "profile_photos_delete_own" ON storage.objects;
  DROP POLICY IF EXISTS "voice_prompts_insert_own" ON storage.objects;
  DROP POLICY IF EXISTS "voice_prompts_select_own" ON storage.objects;
  DROP POLICY IF EXISTS "voice_prompts_delete_own" ON storage.objects;
END $$;

CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- voice-prompts: private; owner full, matched users via signed urls only (read enforced via app)
CREATE POLICY "voice_prompts_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-prompts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voice_prompts_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-prompts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voice_prompts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-prompts' AND auth.uid()::text = (storage.foldername(name))[1]);