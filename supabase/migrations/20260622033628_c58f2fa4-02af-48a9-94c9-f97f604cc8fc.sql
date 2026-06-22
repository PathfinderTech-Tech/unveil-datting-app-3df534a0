
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS verified_phone text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_phone_unique
  ON public.profiles (verified_phone)
  WHERE verified_phone IS NOT NULL;
