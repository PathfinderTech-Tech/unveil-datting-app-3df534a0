
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'unveil_plus', 'unveil_black');
CREATE TYPE public.reveal_stage AS ENUM ('stage_1', 'stage_2', 'stage_3');
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  age INT,
  city TEXT,
  gender TEXT,
  interested_in TEXT,
  intention TEXT,
  archetype TEXT,
  compatibility_score INT DEFAULT 0,
  emotional_rhythm JSONB DEFAULT '{}'::jsonb,
  communication_style JSONB DEFAULT '{}'::jsonb,
  curiosity_level INT DEFAULT 50,
  bio TEXT,
  photo_url TEXT,
  photo_reveal_stage reveal_stage DEFAULT 'stage_1',
  verified BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  game_complete BOOLEAN DEFAULT false,
  subscription_tier subscription_tier DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- ============= ONBOARDING ANSWERS =============
CREATE TABLE public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_answers TO authenticated;
GRANT ALL ON public.onboarding_answers TO service_role;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

-- ============= GAME RESULTS =============
CREATE TABLE public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logic_score INT DEFAULT 0,
  pattern_score INT DEFAULT 0,
  memory_score INT DEFAULT 0,
  emotional_score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  archetype TEXT,
  attempts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.game_results TO authenticated;
GRANT ALL ON public.game_results TO service_role;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- ============= VOICE PROMPTS =============
CREATE TABLE public.voice_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.voice_prompts TO authenticated;
GRANT ALL ON public.voice_prompts TO service_role;
ALTER TABLE public.voice_prompts ENABLE ROW LEVEL SECURITY;

-- ============= MATCHES =============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  compatibility_score INT DEFAULT 0,
  reveal_stage reveal_stage DEFAULT 'stage_1',
  mutual_interest BOOLEAN DEFAULT false,
  user_interested BOOLEAN DEFAULT false,
  matched_user_interested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, matched_user_id),
  CHECK (user_id <> matched_user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ============= CONVERSATIONS =============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============= MESSAGES =============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============= REPORTS =============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============= BLOCKS =============
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ============= WAITLIST =============
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ============= SUBSCRIPTIONS =============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier subscription_tier DEFAULT 'free',
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============= RLS POLICIES =============
-- profiles: own full access; others limited (we expose via view if needed but for simplicity allow read of basic if mutual match — keep simple: own only, plus matched users)
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_matched" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.matches m WHERE (m.user_id = auth.uid() AND m.matched_user_id = profiles.id) OR (m.matched_user_id = auth.uid() AND m.user_id = profiles.id)));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- onboarding_answers
CREATE POLICY "onb_own" ON public.onboarding_answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- game_results
CREATE POLICY "game_select_own" ON public.game_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "game_insert_own" ON public.game_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- voice_prompts
CREATE POLICY "voice_own" ON public.voice_prompts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "voice_select_matched" ON public.voice_prompts FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.matches m WHERE (m.user_id = auth.uid() AND m.matched_user_id = voice_prompts.user_id) OR (m.matched_user_id = auth.uid() AND m.user_id = voice_prompts.user_id)));

-- matches
CREATE POLICY "matches_select_own" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = matched_user_id);
CREATE POLICY "matches_insert_own" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matches_update_own" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = matched_user_id);

-- conversations
CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

-- messages
CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS(SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

-- reports
CREATE POLICY "report_insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "report_select_admin" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- blocks
CREATE POLICY "block_own" ON public.blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- waitlist
CREATE POLICY "wait_insert" ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "wait_admin_select" ON public.waitlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "sub_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============= TRIGGERS =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER onb_touch BEFORE UPDATE ON public.onboarding_answers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER sub_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= STORAGE BUCKETS =============
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-prompts', 'voice-prompts', false) ON CONFLICT DO NOTHING;

-- profile-photos policies (public read, authed write own folder)
CREATE POLICY "pp_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'profile-photos');
CREATE POLICY "pp_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pp_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pp_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- voice-prompts policies (authed read own + matched, write own)
CREATE POLICY "vp_read_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'voice-prompts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vp_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'voice-prompts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vp_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'voice-prompts' AND (storage.foldername(name))[1] = auth.uid()::text);
