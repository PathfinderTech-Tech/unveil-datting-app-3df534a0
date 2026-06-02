
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_interaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.matches_guard_update() FROM PUBLIC, anon, authenticated;
