
-- ============ PROFILES additions ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS state_region text,
  ADD COLUMN IF NOT EXISTS relationship_intent text,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_style text DEFAULT 'real',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS connection_score integer DEFAULT 0;

-- ============ MATCHES additions ============
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS chemistry_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS connection_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_user_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_matched_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_unlocked boolean DEFAULT false;

-- ============ SHARED CONTACTS ============
CREATE TABLE IF NOT EXISTS public.shared_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  matched_user_id uuid NOT NULL,
  phone text,
  whatsapp text,
  telegram text,
  instagram text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, matched_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_contacts TO authenticated;
GRANT ALL ON public.shared_contacts TO service_role;
ALTER TABLE public.shared_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_select_either" ON public.shared_contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = matched_user_id);
CREATE POLICY "share_write_own" ON public.shared_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CHALLENGE PACKS + QUESTIONS ============
CREATE TABLE IF NOT EXISTS public.challenge_packs (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  premium boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_packs TO authenticated, anon;
GRANT ALL ON public.challenge_packs TO service_role;
ALTER TABLE public.challenge_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packs_read_all" ON public.challenge_packs FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id text NOT NULL REFERENCES public.challenge_packs(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenge_questions TO authenticated;
GRANT ALL ON public.challenge_questions TO service_role;
ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read_auth" ON public.challenge_questions FOR SELECT TO authenticated USING (true);

-- ============ PUZZLE CONTENT (new puzzles) ============
CREATE TABLE IF NOT EXISTS public.puzzle_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_type text NOT NULL,  -- quote_who, quote_missing_word, quote_finish, guess_country, pin_country, philosophy, love_quote, proverb
  prompt text NOT NULL,
  answer text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  meta jsonb DEFAULT '{}'::jsonb,
  difficulty integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.puzzle_content TO authenticated;
GRANT ALL ON public.puzzle_content TO service_role;
ALTER TABLE public.puzzle_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puzzle_content_read" ON public.puzzle_content FOR SELECT TO authenticated USING (true);

-- ============ FIRST IMPRESSION RESPONSES ============
CREATE TABLE IF NOT EXISTS public.first_impression_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id text NOT NULL,
  pick text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.first_impression_responses TO authenticated;
GRANT ALL ON public.first_impression_responses TO service_role;
ALTER TABLE public.first_impression_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fi_own" ON public.first_impression_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fi_select_matched" ON public.first_impression_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE (m.user_id = auth.uid() AND m.matched_user_id = first_impression_responses.user_id) OR (m.matched_user_id = auth.uid() AND m.user_id = first_impression_responses.user_id)));

-- ============ BADGES CATALOG ============
CREATE TABLE IF NOT EXISTS public.badges_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  criteria jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges_catalog TO authenticated, anon;
GRANT ALL ON public.badges_catalog TO service_role;
ALTER TABLE public.badges_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_catalog_read" ON public.badges_catalog FOR SELECT TO authenticated, anon USING (true);

-- ============ DATE PLANS ============
CREATE TABLE IF NOT EXISTS public.date_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  date_type text NOT NULL,  -- coffee, lunch, dinner, walk, video, activity
  proposed_at timestamptz,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'pending',  -- pending, accepted, declined, completed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_plans TO authenticated;
GRANT ALL ON public.date_plans TO service_role;
ALTER TABLE public.date_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "date_plans_either" ON public.date_plans FOR SELECT TO authenticated
  USING (auth.uid() = proposer_id OR auth.uid() = invitee_id);
CREATE POLICY "date_plans_insert" ON public.date_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "date_plans_update_either" ON public.date_plans FOR UPDATE TO authenticated
  USING (auth.uid() = proposer_id OR auth.uid() = invitee_id);

-- ============ SHARE UNLOCK FUNCTION ============
CREATE OR REPLACE FUNCTION public.consent_share_contact(_match_user uuid)
RETURNS TABLE (unlocked boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _both boolean := false;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  -- mark consent on my row
  UPDATE public.matches SET share_user_consent = true
   WHERE user_id = _me AND matched_user_id = _match_user;
  -- mark consent on other side's matched flag
  UPDATE public.matches SET share_matched_consent = true
   WHERE user_id = _match_user AND matched_user_id = _me;

  -- check mutual: both rows must have user_consent = true
  SELECT (
    (SELECT COALESCE(share_user_consent,false) FROM public.matches WHERE user_id = _me AND matched_user_id = _match_user)
    AND
    (SELECT COALESCE(share_user_consent,false) FROM public.matches WHERE user_id = _match_user AND matched_user_id = _me)
  ) INTO _both;

  IF _both THEN
    UPDATE public.matches SET share_unlocked = true
     WHERE (user_id = _me AND matched_user_id = _match_user)
        OR (user_id = _match_user AND matched_user_id = _me);
  END IF;

  RETURN QUERY SELECT _both;
END; $$;

-- ============ SCORE BUMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.bump_match_interaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a uuid; _b uuid;
BEGIN
  SELECT user_a, user_b INTO _a, _b FROM public.conversations WHERE id = NEW.conversation_id;
  IF _a IS NULL THEN RETURN NEW; END IF;
  UPDATE public.matches SET
    interaction_count = COALESCE(interaction_count,0) + 1,
    chemistry_score = LEAST(100, COALESCE(chemistry_score,0) + 1),
    connection_score = LEAST(100, COALESCE(connection_score,0) + 1)
  WHERE (user_id IN (_a,_b) AND matched_user_id IN (_a,_b));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_bump_match ON public.messages;
CREATE TRIGGER trg_bump_match AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_match_interaction();

-- ============ SEED BADGES ============
INSERT INTO public.badges_catalog (id, name, description, icon) VALUES
  ('explorer','Explorer','Discovered 10+ profiles','compass'),
  ('romantic','Romantic','Sent 25+ messages','heart'),
  ('great_listener','Great Listener','Listened to 5+ voice notes','ear'),
  ('storyteller','Storyteller','Recorded a voice intro','mic'),
  ('adventurer','Adventurer','Planned a date','map'),
  ('foodie','Foodie','Planned a dinner/lunch date','utensils'),
  ('conversation_master','Conversation Master','100+ messages in one chat','message-circle'),
  ('challenge_champion','Challenge Champion','Completed 10+ challenges','trophy')
ON CONFLICT (id) DO NOTHING;
