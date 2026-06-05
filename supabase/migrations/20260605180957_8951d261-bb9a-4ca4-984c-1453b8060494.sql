
CREATE OR REPLACE FUNCTION public.thoughts_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR current_setting('app.allow_thoughts_managed_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.delivered_as_message_id IS DISTINCT FROM OLD.delivered_as_message_id
  THEN
    RAISE EXCEPTION 'Only read_at is user-editable on thoughts';
  END IF;
  IF auth.uid() <> OLD.recipient_id THEN
    RAISE EXCEPTION 'Only the recipient can mark a thought as read';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.send_thought(_target uuid, _content text)
 RETURNS TABLE(thought_id uuid, mutual boolean, conversation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _tid uuid;
  _like record;
  _conv uuid;
  _mutual boolean := false;
  _recent_count int;
  _msg_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _me = _target THEN RAISE EXCEPTION 'cannot send a thought to yourself'; END IF;
  IF _content IS NULL OR length(btrim(_content)) = 0 THEN RAISE EXCEPTION 'empty thought'; END IF;
  IF length(_content) > 280 THEN RAISE EXCEPTION 'thought too long'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = _me AND b.blocked_id = _target)
       OR (b.blocker_id = _target AND b.blocked_id = _me)
  ) THEN RAISE EXCEPTION 'blocked'; END IF;

  SELECT count(*) INTO _recent_count
  FROM public.thoughts WHERE sender_id = _me AND created_at > now() - interval '1 hour';
  IF _recent_count >= 20 THEN
    RAISE EXCEPTION 'THOUGHT_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO _like FROM public.like_profile(_target);
  _mutual := COALESCE(_like.mutual, false);
  _conv := _like.conversation_id;

  INSERT INTO public.thoughts (sender_id, recipient_id, content)
  VALUES (_me, _target, btrim(_content))
  RETURNING id INTO _tid;

  IF _mutual AND _conv IS NOT NULL THEN
    PERFORM set_config('app.allow_thoughts_managed_update', 'true', true);
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
END; $function$;
