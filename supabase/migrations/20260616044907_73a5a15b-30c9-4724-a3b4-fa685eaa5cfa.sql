
-- =========================================================================
-- GIFT CATALOG
-- =========================================================================
CREATE TABLE public.gift_catalog (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  gem_cost INT NOT NULL DEFAULT 10,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium','milestone')),
  default_message TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gift_catalog TO anon, authenticated;
GRANT ALL ON public.gift_catalog TO service_role;

ALTER TABLE public.gift_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gift catalog is public"
  ON public.gift_catalog FOR SELECT
  TO anon, authenticated
  USING (active = true);

INSERT INTO public.gift_catalog (slug, name, emoji, gem_cost, tier, default_message, sort_order) VALUES
  ('rose',          'Rose',          '🌹', 10,  'free',      'I enjoy talking to you.',          10),
  ('coffee',        'Coffee',        '☕', 15,  'free',      'Coffee on me — virtually.',        20),
  ('spark',         'Spark',         '✨', 20,  'free',      'You sparked something today.',     30),
  ('heart_note',    'Heart Note',    '💌', 20,  'premium',   'A little note from me to you.',    40),
  ('teddy_bear',    'Teddy Bear',    '🧸', 30,  'premium',   'A little something to hold onto.', 50),
  ('scented_candle','Scented Candle','🕯️',40,  'premium',   'Light this up and think of me.',   60),
  ('love_letter',   'Love Letter',   '💝', 50,  'premium',   'Words I wanted you to read.',      70),
  ('bouquet',       'Bouquet',       '💐', 75,  'milestone', 'You deserve something beautiful.', 80),
  ('champagne',     'Champagne',     '🥂', 100, 'milestone', 'To us — and where this is going.', 90);

-- =========================================================================
-- GIFT SENDS
-- =========================================================================
CREATE TABLE public.gift_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  gift_slug TEXT NOT NULL REFERENCES public.gift_catalog(slug),
  note TEXT,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX gift_sends_sender_idx ON public.gift_sends(sender_id, created_at DESC);
CREATE INDEX gift_sends_recipient_idx ON public.gift_sends(recipient_id, created_at DESC);
CREATE INDEX gift_sends_conversation_idx ON public.gift_sends(conversation_id, created_at DESC);

GRANT SELECT ON public.gift_sends TO authenticated;
GRANT ALL ON public.gift_sends TO service_role;

ALTER TABLE public.gift_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their gift sends"
  ON public.gift_sends FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- =========================================================================
-- GIFT JOURNEY (per pair, ordered)
-- =========================================================================
CREATE TABLE public.gift_journey (
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_gifts INT NOT NULL DEFAULT 0,
  last_gift_at TIMESTAMPTZ,
  streak_days INT NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'first_gift' CHECK (stage IN ('first_gift','meaningful','deep_connection')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

GRANT SELECT ON public.gift_journey TO authenticated;
GRANT ALL ON public.gift_journey TO service_role;

ALTER TABLE public.gift_journey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pair members can view their journey"
  ON public.gift_journey FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- =========================================================================
-- GIFT WEEKLY USAGE (free-tier quota)
-- =========================================================================
CREATE TABLE public.gift_weekly_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  sent_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

GRANT SELECT ON public.gift_weekly_usage TO authenticated;
GRANT ALL ON public.gift_weekly_usage TO service_role;

ALTER TABLE public.gift_weekly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own weekly usage"
  ON public.gift_weekly_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
