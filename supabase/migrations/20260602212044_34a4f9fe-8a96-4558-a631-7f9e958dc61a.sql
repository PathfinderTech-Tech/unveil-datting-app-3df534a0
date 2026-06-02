
-- 1. Drop profiles.email (duplicates auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- 2. Restrict matches UPDATE via guard trigger
CREATE OR REPLACE FUNCTION public.matches_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.matched_user_id IS DISTINCT FROM OLD.matched_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reveal_stage IS DISTINCT FROM OLD.reveal_stage
     OR NEW.mutual_interest IS DISTINCT FROM OLD.mutual_interest
     OR NEW.share_unlocked IS DISTINCT FROM OLD.share_unlocked
     OR NEW.compatibility_score IS DISTINCT FROM OLD.compatibility_score
     OR NEW.chemistry_score IS DISTINCT FROM OLD.chemistry_score
     OR NEW.connection_score IS DISTINCT FROM OLD.connection_score
     OR NEW.interaction_count IS DISTINCT FROM OLD.interaction_count
  THEN
    RAISE EXCEPTION 'Field not user-editable on matches; use security-definer RPCs';
  END IF;

  IF _uid = OLD.user_id THEN
    IF NEW.matched_user_interested IS DISTINCT FROM OLD.matched_user_interested
       OR NEW.share_matched_consent IS DISTINCT FROM OLD.share_matched_consent
    THEN
      RAISE EXCEPTION 'Cannot modify other party fields on matches';
    END IF;
  ELSIF _uid = OLD.matched_user_id THEN
    IF NEW.user_interested IS DISTINCT FROM OLD.user_interested
       OR NEW.share_user_consent IS DISTINCT FROM OLD.share_user_consent
    THEN
      RAISE EXCEPTION 'Cannot modify other party fields on matches';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS matches_guard_update_trg ON public.matches;
CREATE TRIGGER matches_guard_update_trg
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.matches_guard_update();

-- 3. conversations: require mutual match on INSERT
DROP POLICY IF EXISTS conv_insert ON public.conversations;
CREATE POLICY conv_insert ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b)
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE COALESCE(m.mutual_interest, false) = true
        AND ((m.user_id = user_a AND m.matched_user_id = user_b)
          OR (m.user_id = user_b AND m.matched_user_id = user_a))
    )
  );

-- 4. puzzle_content: hide answer from clients via answer-free view
DROP POLICY IF EXISTS puzzle_content_read ON public.puzzle_content;

CREATE OR REPLACE VIEW public.puzzle_content_public
WITH (security_invoker = true) AS
SELECT id, puzzle_type, prompt, options, meta, difficulty, created_at
FROM public.puzzle_content;

GRANT SELECT ON public.puzzle_content_public TO anon, authenticated;
REVOKE ALL ON public.puzzle_content FROM anon, authenticated;
GRANT ALL ON public.puzzle_content TO service_role;

-- 5. user_badges: remove client self-insert
DROP POLICY IF EXISTS badges_insert_own ON public.user_badges;

-- 6. SECURITY DEFINER function exposure
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discover_profiles(integer, integer, boolean, text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.like_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consent_share_contact(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.discover_profiles(integer, integer, boolean, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consent_share_contact(uuid) TO authenticated;

-- 7. Storage: profile-photos — disallow listing/enumeration
DROP POLICY IF EXISTS profile_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS pp_read ON storage.objects;
