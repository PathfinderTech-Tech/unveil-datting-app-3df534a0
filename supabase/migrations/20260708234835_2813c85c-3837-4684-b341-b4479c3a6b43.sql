ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS journey_health_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS journey_health_consent_at timestamptz;