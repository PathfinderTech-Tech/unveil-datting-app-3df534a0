-- Upgrade subscriptions table for Stripe webhook flow
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

-- Make stripe_subscription_id unique (required for upsert onConflict)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_stripe_subscription_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Service role needs full access for webhook writes
GRANT ALL ON public.subscriptions TO service_role;

-- Allow service role to write via webhook (already has policy for SELECT own)
DROP POLICY IF EXISTS "sub_service_all" ON public.subscriptions;
CREATE POLICY "sub_service_all" ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Active subscription helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;