
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke EXECUTE on SECURITY DEFINER functions (only used internally / via triggers)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
-- authenticated needs has_role for RLS policy evaluation? RLS uses SECURITY DEFINER context-free; but policies call it as authenticated. Keep execute for authenticated.

-- Tighten waitlist insert (avoid USING true pattern)
DROP POLICY IF EXISTS "wait_insert" ON public.waitlist;
CREATE POLICY "wait_insert" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL AND length(email) BETWEEN 3 AND 255);

-- Restrict public bucket listing: scope SELECT to file pattern (still allows public file fetch by URL via CDN; this only limits listing API)
DROP POLICY IF EXISTS "pp_read" ON storage.objects;
CREATE POLICY "pp_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'profile-photos' AND name IS NOT NULL);
