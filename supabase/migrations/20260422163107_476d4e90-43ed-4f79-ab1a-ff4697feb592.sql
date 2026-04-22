
-- Create cases table
CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text,
  urgency text,
  problem_summary text,
  facts jsonb DEFAULT '{}'::jsonb,
  next_steps jsonb DEFAULT '[]'::jsonb,
  estimated_damage numeric,
  city text,
  is_fact_gathering_complete boolean NOT NULL DEFAULT false,
  consent_personal_data boolean NOT NULL DEFAULT false,
  privacy_policy_accepted boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  category text,
  urgency text,
  public_summary text,
  estimated_damage numeric,
  city text,
  price_rub integer NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contact text NOT NULL,
  consent_personal_data boolean NOT NULL DEFAULT false,
  consent_transfer_to_lawyer boolean NOT NULL DEFAULT false,
  privacy_policy_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  lawyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_rub integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, lawyer_id)
);

-- Triggers
DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- Cases policies: anonymous chat allowed (user_id NULL), owners + admins access
CREATE POLICY "Users view own cases" ON public.cases FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can insert cases" ON public.cases FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users update own cases" ON public.cases FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(),'admin'));

-- case_messages: tied to case access
CREATE POLICY "View messages of accessible case" ON public.case_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id
    AND (c.user_id = auth.uid() OR c.user_id IS NULL OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Insert messages of accessible case" ON public.case_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id
    AND (c.user_id = auth.uid() OR c.user_id IS NULL)));

-- Leads: lawyers and admins can view
CREATE POLICY "Lawyers view leads" ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(),'lawyer') OR public.has_role(auth.uid(),'admin'));

-- lead_contacts: only after purchase or admin
CREATE POLICY "View contacts after purchase" ON public.lead_contacts FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.lead_purchases p
      WHERE p.lead_id = lead_contacts.lead_id AND p.lawyer_id = auth.uid())
  );

-- lead_purchases: lawyer sees own purchases
CREATE POLICY "Lawyers view own purchases" ON public.lead_purchases FOR SELECT
  USING (auth.uid() = lawyer_id OR public.has_role(auth.uid(),'admin'));
