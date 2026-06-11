
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS continent_code TEXT,
  ADD COLUMN IF NOT EXISTS open_to_international BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2';
COMMENT ON COLUMN public.profiles.continent_code IS 'AF, AN, AS, EU, NA, OC, SA';
COMMENT ON COLUMN public.profiles.discovery_radius_km IS 'Positive = km radius. Sentinels: -1 = anywhere in country, -2 = anywhere in continent, 0 = anywhere in world.';

CREATE INDEX IF NOT EXISTS profiles_country_code_idx ON public.profiles (country_code);
CREATE INDEX IF NOT EXISTS profiles_continent_code_idx ON public.profiles (continent_code);
