-- Privacy hardening: stop exposing administrative / financial / trust / moderation
-- columns of the profiles table to matched peers. Introduce a security-barrier view
-- that returns only safe public-facing columns, and drop the wildcard matched SELECT
-- policy on the base table.

-- 1) Drop wildcard matched SELECT policy. After this, .from('profiles') only returns
--    the caller's own row (profiles_select_own). Peer reads must use profiles_peer.
DROP POLICY IF EXISTS profiles_select_matched ON public.profiles;

-- 2) Create a security-barrier view exposing only safe fields. The view enforces
--    "self OR mutually matched" in its WHERE clause and is owned by postgres so it
--    bypasses the underlying RLS (security_invoker = false, the default).
DROP VIEW IF EXISTS public.profiles_peer;
CREATE VIEW public.profiles_peer
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.first_name,
  p.age,
  p.city,
  p.country,
  p.gender,
  p.intention,
  p.interested_in,
  p.bio,
  p.archetype,
  p.photo_url,
  p.profile_photo_url,
  p.avatar_url,
  p.verified,
  p.preferred_language,
  p.relationship_intent,
  p.curiosity_level,
  p.emotional_rhythm,
  p.interests,
  p.location_enabled,
  p.location_privacy,
  p.compatibility_score,
  p.communication_style,
  p.discovery_mode,
  p.travel_status,
  p.updated_at
FROM public.profiles p
WHERE p.id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.matches m
     WHERE m.mutual_interest = true
       AND (
         (m.user_id = auth.uid() AND m.matched_user_id = p.id)
         OR (m.user_id = p.id AND m.matched_user_id = auth.uid())
       )
   );

REVOKE ALL ON public.profiles_peer FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_peer TO authenticated;
GRANT SELECT ON public.profiles_peer TO service_role;