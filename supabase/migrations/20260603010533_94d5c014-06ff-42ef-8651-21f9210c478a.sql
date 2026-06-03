
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS avatar_generated_at timestamptz;
