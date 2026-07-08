
-- Journey feature: Solo + Couple walking journeys with manual logs

CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('solo','couple')),
  from_city text NOT NULL,
  from_country text,
  from_flag text,
  to_city text NOT NULL,
  to_country text,
  to_flag text,
  total_miles numeric(10,2) NOT NULL,
  total_km numeric(10,2),
  landmarks jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_in_chat boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.journey_participants (
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('heart','mind','solo')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, user_id)
);

CREATE INDEX idx_journey_participants_user ON public.journey_participants(user_id);

CREATE TABLE public.journey_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  miles numeric(8,2) NOT NULL CHECK (miles > 0 AND miles <= 100),
  steps integer,
  activity text NOT NULL DEFAULT 'walking' CHECK (activity IN ('walking','running','cycling','hiking')),
  logged_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journey_logs_journey ON public.journey_logs(journey_id);
CREATE INDEX idx_journey_logs_user ON public.journey_logs(user_id);

CREATE TABLE public.journey_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_offered text NOT NULL CHECK (role_offered IN ('heart','mind')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (journey_id, to_user_id)
);

CREATE INDEX idx_journey_invites_to ON public.journey_invites(to_user_id) WHERE status = 'pending';
CREATE INDEX idx_journey_invites_from ON public.journey_invites(from_user_id);

-- GRANTS (Data API requires explicit grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT ALL ON public.journeys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_participants TO authenticated;
GRANT ALL ON public.journey_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_logs TO authenticated;
GRANT ALL ON public.journey_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_invites TO authenticated;
GRANT ALL ON public.journey_invites TO service_role;

-- RLS
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_invites ENABLE ROW LEVEL SECURITY;

-- Security-definer helper to avoid recursive RLS between journeys/participants
CREATE OR REPLACE FUNCTION public.is_journey_participant(_journey_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journey_participants
    WHERE journey_id = _journey_id AND user_id = _user_id
  );
$$;

-- journeys policies
CREATE POLICY "Journeys: participants can view"
ON public.journeys FOR SELECT TO authenticated
USING (
  public.is_journey_participant(id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.journey_invites ji
    WHERE ji.journey_id = journeys.id
      AND ji.to_user_id = auth.uid()
      AND ji.status = 'pending'
  )
);

CREATE POLICY "Journeys: creator can insert"
ON public.journeys FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Journeys: participants can update"
ON public.journeys FOR UPDATE TO authenticated
USING (public.is_journey_participant(id, auth.uid()))
WITH CHECK (public.is_journey_participant(id, auth.uid()));

CREATE POLICY "Journeys: creator can delete"
ON public.journeys FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- participants policies
CREATE POLICY "Participants: co-participants can view"
ON public.journey_participants FOR SELECT TO authenticated
USING (public.is_journey_participant(journey_id, auth.uid()));

CREATE POLICY "Participants: self insert"
ON public.journey_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Participants: self leave"
ON public.journey_participants FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- logs policies
CREATE POLICY "Logs: participants can view"
ON public.journey_logs FOR SELECT TO authenticated
USING (public.is_journey_participant(journey_id, auth.uid()));

CREATE POLICY "Logs: own insert on own journeys"
ON public.journey_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_journey_participant(journey_id, auth.uid())
);

CREATE POLICY "Logs: own delete"
ON public.journey_logs FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- invites policies
CREATE POLICY "Invites: participants of either side can view"
ON public.journey_invites FOR SELECT TO authenticated
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Invites: inviter can create"
ON public.journey_invites FOR INSERT TO authenticated
WITH CHECK (
  from_user_id = auth.uid()
  AND public.is_journey_participant(journey_id, auth.uid())
);

CREATE POLICY "Invites: recipient or inviter can update"
ON public.journey_invites FOR UPDATE TO authenticated
USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- updated_at trigger for journeys
CREATE TRIGGER journeys_touch_updated_at
BEFORE UPDATE ON public.journeys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
