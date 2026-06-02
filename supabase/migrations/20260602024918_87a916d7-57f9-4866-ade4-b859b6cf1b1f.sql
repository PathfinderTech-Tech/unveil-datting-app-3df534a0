REVOKE EXECUTE ON FUNCTION public.discover_profiles(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.like_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discover_profiles(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.like_profile(uuid) TO authenticated;