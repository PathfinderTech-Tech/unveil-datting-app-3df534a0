
-- 1) account_deletions table
CREATE TABLE public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_deletions_email_idx ON public.account_deletions (lower(email), deleted_at DESC);

GRANT ALL ON public.account_deletions TO service_role;
-- no anon/authenticated access

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ad_service_all ON public.account_deletions
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2) Cooldown helper
CREATE OR REPLACE FUNCTION public.is_email_in_cooldown(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_deletions
    WHERE lower(email) = lower(_email)
      AND deleted_at > now() - interval '24 hours'
  );
$$;

-- 3) Patch handle_new_user to block within cooldown window
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _approved boolean;
BEGIN
  IF NEW.email IS NOT NULL AND public.is_email_in_cooldown(NEW.email) THEN
    RAISE EXCEPTION 'ACCOUNT_DELETION_COOLDOWN: please wait 24 hours before re-registering with this email'
      USING ERRCODE = 'P0001';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.waitlist WHERE lower(email) = lower(NEW.email) AND status = 'approved')
    INTO _approved;
  INSERT INTO public.profiles (id, beta_member) VALUES (NEW.id, COALESCE(_approved,false)) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free') ON CONFLICT DO NOTHING;
  IF NEW.email = 'support@unveil.best' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) thoughts table
CREATE TABLE public.thoughts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 280),
  delivered_as_message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX thoughts_recipient_idx ON public.thoughts (recipient_id, created_at DESC);
CREATE INDEX thoughts_sender_idx ON public.thoughts (sender_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.thoughts TO authenticated;
GRANT ALL ON public.thoughts TO service_role;

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY thoughts_select_participant ON public.thoughts
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY thoughts_update_recipient ON public.thoughts
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- Inserts go through the RPC only; block direct inserts by not granting INSERT policy.
-- (No INSERT policy → blocked for authenticated; service_role bypasses.)

-- 5) send_thought RPC: registers interest + stores thought + optional mutual conversation
CREATE OR REPLACE FUNCTION public.send_thought(_target uuid, _content text)
RETURNS TABLE(thought_id uuid, mutual boolean, conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _tid uuid;
  _like record;
  _conv uuid;
  _mutual boolean := false;
  _recent_count int;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN RAISE EXCEPTION 'cannot send a thought to yourself'; END IF;
  IF _content IS NULL OR length(btrim(_content)) = 0 THEN RAISE EXCEPTION 'empty thought'; END IF;
  IF length(_content) > 280 THEN RAISE EXCEPTION 'thought too long'; END IF;

  -- Block if either side has blocked the other
  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = _me AND b.blocked_id = _target)
       OR (b.blocker_id = _target AND b.blocked_id = _me)
  ) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  -- Simple rate limit: max 20 thoughts per hour per sender
  SELECT count(*) INTO _recent_count
  FROM public.thoughts
  WHERE sender_id = _me AND created_at > now() - interval '1 hour';
  IF _recent_count >= 20 THEN
    RAISE EXCEPTION 'THOUGHT_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  -- Register interest (re-uses like_profile semantics)
  SELECT * INTO _like FROM public.like_profile(_target);
  _mutual := COALESCE(_like.mutual, false);
  _conv := _like.conversation_id;

  INSERT INTO public.thoughts (sender_id, recipient_id, content)
  VALUES (_me, _target, btrim(_content))
  RETURNING id INTO _tid;

  -- If mutual, also deliver as a chat message in the new conversation
  IF _mutual AND _conv IS NOT NULL THEN
    DECLARE _msg_id uuid;
    BEGIN
      INSERT INTO public.messages (conversation_id, sender_id, content, message_type)
      VALUES (_conv, _me, btrim(_content), 'thought')
      RETURNING id INTO _msg_id;
      UPDATE public.thoughts SET delivered_as_message_id = _msg_id WHERE id = _tid;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN QUERY SELECT _tid, _mutual, _conv;
END; $$;

GRANT EXECUTE ON FUNCTION public.send_thought(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_in_cooldown(text) TO anon, authenticated;
