
-- Drop old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate handle_new_user to also send Telegram notification via pg_net for lawyer apps
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
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Only run once when email gets confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if profile already exists (idempotency)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

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

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
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

    -- Send admin notification via pg_net
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      v_supabase_url := 'https://xiabzxurtsanzmkniozf.supabase.co';
    END IF;
    v_anon_key := current_setting('app.settings.anon_key', true);
    IF v_anon_key IS NULL OR v_anon_key = '' THEN
      v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYWJ6eHVydHNhbnpta25pb3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTUwMzAsImV4cCI6MjA5MjQzMTAzMH0.fbyQdKubC7Flus9FbFK0YeqyYUADxiKCKH7W4cBWa3U';
    END IF;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-lawyer-application',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || v_anon_key),
      body := jsonb_build_object('user_id', NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fire on INSERT (covers cases where user gets created already confirmed, e.g. admin invite or auto-confirm) 
-- AND on UPDATE when email gets confirmed
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user();
