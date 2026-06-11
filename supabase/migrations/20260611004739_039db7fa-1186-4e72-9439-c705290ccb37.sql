
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS current_city TEXT;

UPDATE public.profiles
   SET home_city = COALESCE(home_city, city),
       current_city = COALESCE(current_city, city)
 WHERE city IS NOT NULL;

ALTER TABLE public.location_verifications
  ADD COLUMN IF NOT EXISTS device_timezone TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Default verified_at to created_at retroactively
UPDATE public.location_verifications SET verified_at = created_at WHERE verified_at IS NULL;
