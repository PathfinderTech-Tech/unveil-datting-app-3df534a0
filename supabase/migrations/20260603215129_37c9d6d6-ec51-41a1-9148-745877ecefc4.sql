
ALTER TABLE public.account_deletions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS reactivation_allowed_at timestamptz;

UPDATE public.account_deletions
  SET reactivation_allowed_at = deleted_at + interval '24 hours'
  WHERE reactivation_allowed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_reactivation_allowed_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reactivation_allowed_at IS NULL THEN
    NEW.reactivation_allowed_at := COALESCE(NEW.deleted_at, now()) + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_deletions_reactivation ON public.account_deletions;
CREATE TRIGGER trg_account_deletions_reactivation
  BEFORE INSERT ON public.account_deletions
  FOR EACH ROW EXECUTE FUNCTION public.set_reactivation_allowed_at();

-- Audit log
CREATE TABLE IF NOT EXISTS public.account_deletion_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  provider text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS account_deletion_attempts_email_idx
  ON public.account_deletion_attempts (lower(email), attempted_at DESC);

GRANT SELECT ON public.account_deletion_attempts TO authenticated;
GRANT ALL ON public.account_deletion_attempts TO service_role;
ALTER TABLE public.account_deletion_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ada_select_admin ON public.account_deletion_attempts;
CREATE POLICY ada_select_admin ON public.account_deletion_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public callable cooldown check (no PII besides timestamp)
CREATE OR REPLACE FUNCTION public.check_email_cooldown(_email text)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT MAX(reactivation_allowed_at)
    FROM public.account_deletions
   WHERE lower(email) = lower(_email)
     AND reactivation_allowed_at > now();
$$;
GRANT EXECUTE ON FUNCTION public.check_email_cooldown(text) TO anon, authenticated;

-- Log attempt (anon-callable; rate-limited by Supabase defaults)
CREATE OR REPLACE FUNCTION public.log_deletion_attempt(_email text, _provider text, _outcome text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_deletion_attempts (email, provider, outcome)
  VALUES (_email, _provider, _outcome);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_deletion_attempt(text, text, text) TO anon, authenticated;
