-- 1) Profile flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

-- 2) verification_payments
CREATE TABLE public.verification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verification_payments TO authenticated;
GRANT ALL ON public.verification_payments TO service_role;
ALTER TABLE public.verification_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY vp_select_own ON public.verification_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY vp_service_all ON public.verification_payments FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE TRIGGER vp_touch BEFORE UPDATE ON public.verification_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) transactions (unified ledger)
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  price_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tx_user_idx ON public.transactions(user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tx_select_own ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY tx_service_all ON public.transactions FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 4) Update handle_new_user to grant admin role for support email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  IF NEW.email = 'support@unveil.best' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5) Backfill admin if support user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'support@unveil.best'
ON CONFLICT DO NOTHING;