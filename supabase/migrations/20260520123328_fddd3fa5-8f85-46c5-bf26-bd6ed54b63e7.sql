CREATE TYPE public.lawyer_app_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.lawyer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  email text,
  status public.lawyer_app_status NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applications" ON public.lawyer_applications
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users view own application" ON public.lawyer_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER trg_lawyer_apps_updated
  BEFORE UPDATE ON public.lawyer_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update signup trigger to create lawyer application when requested_role='lawyer'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text;
  v_referrer_id uuid;
  v_new_code text := public.gen_referral_code();
  v_requested_role text;
BEGIN
  v_ref_code := NEW.raw_user_meta_data->>'ref';
  v_requested_role := NEW.raw_user_meta_data->>'requested_role';

  IF v_ref_code IS NOT NULL AND length(v_ref_code) > 0 THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = upper(v_ref_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by, bonus_messages)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_new_code,
    v_referrer_id,
    CASE WHEN v_referrer_id IS NOT NULL THEN 5 ELSE 0 END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_user_id, bonus_messages_granted)
    VALUES (v_referrer_id, NEW.id, 5)
    ON CONFLICT (referred_user_id) DO NOTHING;

    UPDATE public.profiles SET bonus_messages = bonus_messages + 5 WHERE id = v_referrer_id;
  END IF;

  IF v_requested_role = 'lawyer' THEN
    INSERT INTO public.lawyer_applications (user_id, full_name, email, status)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;