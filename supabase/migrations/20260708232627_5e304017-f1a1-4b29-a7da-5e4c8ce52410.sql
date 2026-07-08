
REVOKE EXECUTE ON FUNCTION public.is_journey_participant(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_journey_participant(uuid, uuid) TO authenticated, service_role;
