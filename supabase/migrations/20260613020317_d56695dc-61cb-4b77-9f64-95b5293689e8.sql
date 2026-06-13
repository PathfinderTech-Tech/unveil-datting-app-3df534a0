-- Retire legacy staged photo-reveal system. The 7-day journey is now contact exchange only.
-- Drop the reveal_progress table; nothing else depends on it (can_share_contacts uses matches.created_at).
DROP TABLE IF EXISTS public.reveal_progress CASCADE;