-- Security fix: remove hardcoded email-based admin grant from signup.
-- Admin roles must be assigned manually/out-of-band, never by email match
-- on auth.users insert (which can fire before email ownership is proven).
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
  RETURN NEW;
END;
$function$;
