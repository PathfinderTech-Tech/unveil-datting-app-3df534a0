
-- WAITLIST expansion
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS relationship_goal text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique ON public.waitlist (lower(email));

-- admins can update waitlist
DROP POLICY IF EXISTS wait_admin_update ON public.waitlist;
CREATE POLICY wait_admin_update ON public.waitlist FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public function: is this email approved for beta? (callable by anon for signup gate)
CREATE OR REPLACE FUNCTION public.is_email_approved(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.waitlist
    WHERE lower(email) = lower(_email) AND status = 'approved'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_email_approved(text) TO anon, authenticated;

-- Profile beta flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_member boolean NOT NULL DEFAULT false;

-- Auto-mark beta_member on user creation if email is on approved waitlist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _approved boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.waitlist WHERE lower(email) = lower(NEW.email) AND status = 'approved')
    INTO _approved;
  INSERT INTO public.profiles (id, beta_member) VALUES (NEW.id, COALESCE(_approved,false)) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  IF NEW.email = 'support@unveil.best' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- FEEDBACK
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL CHECK (kind IN ('bug','feature','general')),
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_insert_any ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY feedback_select_own ON public.feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

-- ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ae_insert_anyone ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY ae_select_admin ON public.analytics_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS ae_event_idx ON public.analytics_events (event, created_at DESC);
