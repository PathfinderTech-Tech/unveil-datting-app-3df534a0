CREATE TABLE IF NOT EXISTS public.failure_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  user_id uuid,
  message text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS failure_logs_category_created_idx ON public.failure_logs (category, created_at DESC);
CREATE INDEX IF NOT EXISTS failure_logs_created_idx ON public.failure_logs (created_at DESC);

GRANT SELECT ON public.failure_logs TO authenticated;
GRANT ALL ON public.failure_logs TO service_role;

ALTER TABLE public.failure_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view failure logs" ON public.failure_logs;
CREATE POLICY "Admins can view failure logs"
  ON public.failure_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_failure_stats(_hours integer DEFAULT 24)
RETURNS TABLE(category text, severity text, count bigint, last_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT category, severity, count(*)::bigint, max(created_at)
  FROM public.failure_logs
  WHERE created_at > now() - make_interval(hours => _hours)
  GROUP BY category, severity
  ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_failure_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_failure_stats(integer) TO authenticated, service_role;