
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  legal_first_name text,
  legal_last_name text,
  date_of_birth date,
  country text,
  id_type text,
  selfie_url text,
  id_front_url text,
  id_back_url text,
  profile_photo_url text,
  status text NOT NULL DEFAULT 'draft',
  reviewer_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_requests_status_check
    CHECK (status IN ('draft','submitted','pending_review','approved','rejected')),
  CONSTRAINT verification_requests_id_type_check
    CHECK (id_type IS NULL OR id_type IN ('passport','national_id','drivers_license','residence_permit'))
);

GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_select_own"
  ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "verification_insert_own"
  ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verification_update_own"
  ON public.verification_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TRIGGER verification_requests_touch
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
