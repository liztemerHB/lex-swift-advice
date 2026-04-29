-- Plan enum
DO $$ BEGIN
  CREATE TYPE public.user_plan AS ENUM ('free', 'pro', 'unlimited');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan public.user_plan NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bonus_messages integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_documents integer NOT NULL DEFAULT 0;

-- Generate referral codes for existing rows
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

UPDATE public.profiles
SET referral_code = public.gen_referral_code()
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT public.gen_referral_code();

-- Daily usage table (messages, docs per UTC calendar day)
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  ai_messages integer NOT NULL DEFAULT 0,
  documents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily usage" ON public.usage_daily
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own daily usage" ON public.usage_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own daily usage" ON public.usage_daily
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage daily usage" ON public.usage_daily
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER usage_daily_updated_at BEFORE UPDATE ON public.usage_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly usage table (Pro: 3 docs / month)
CREATE TABLE IF NOT EXISTS public.usage_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'utc')::date,
  documents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

ALTER TABLE public.usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own monthly usage" ON public.usage_monthly
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own monthly usage" ON public.usage_monthly
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own monthly usage" ON public.usage_monthly
  FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage monthly usage" ON public.usage_monthly
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER usage_monthly_updated_at BEFORE UPDATE ON public.usage_monthly
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  bonus_messages_granted integer NOT NULL DEFAULT 5,
  bonus_documents_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals
  FOR SELECT USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admins manage referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update handle_new_user to set referral_code and apply ?ref= from raw_user_meta_data
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
BEGIN
  v_ref_code := NEW.raw_user_meta_data->>'ref';

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

  RETURN NEW;
END;
$function$;