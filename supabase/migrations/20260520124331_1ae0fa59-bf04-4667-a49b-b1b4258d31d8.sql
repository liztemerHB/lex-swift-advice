
CREATE TABLE public.lawyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  photo_url text,
  region text,
  city text,
  education text,
  additional_education text,
  practice_areas text[] DEFAULT '{}',
  work_experience text,
  years_experience integer,
  bio text,
  languages text[] DEFAULT '{}',
  is_advocate boolean NOT NULL DEFAULT false,
  advocate_since date,
  bar_chamber text,
  license_number text,
  diploma_urls text[] DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lawyer manages own profile"
ON public.lawyer_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all lawyer profiles"
ON public.lawyer_profiles FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view lawyer profile via chat"
ON public.lawyer_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.lawyer_id = lawyer_profiles.user_id
      AND t.client_id = auth.uid()
  )
);

CREATE TRIGGER trg_lawyer_profiles_updated_at
BEFORE UPDATE ON public.lawyer_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('lawyer-docs', 'lawyer-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lawyer uploads own docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lawyer-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lawyer views own docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lawyer-docs' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.lawyer_id::text = (storage.foldername(name))[1]
        AND t.client_id = auth.uid()
    )
  )
);

CREATE POLICY "Lawyer updates own docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lawyer-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Lawyer deletes own docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'lawyer-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
