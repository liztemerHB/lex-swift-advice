-- Threads
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,
  case_id uuid,
  lawyer_id uuid NOT NULL,
  client_id uuid,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_threads_lawyer ON public.chat_threads(lawyer_id);
CREATE INDEX idx_chat_threads_client ON public.chat_threads(client_id);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view thread" ON public.chat_threads
  FOR SELECT USING (
    auth.uid() = lawyer_id OR auth.uid() = client_id OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "Admins manage threads" ON public.chat_threads
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Messages
CREATE TABLE public.chat_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  attachment_path text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_msgs_thread ON public.chat_thread_messages(thread_id, created_at);

ALTER TABLE public.chat_thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages" ON public.chat_thread_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (auth.uid() = t.lawyer_id OR auth.uid() = t.client_id OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "Participants send messages" ON public.chat_thread_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id
        AND (auth.uid() = t.lawyer_id OR auth.uid() = t.client_id)
    )
  );

-- Update thread last_message_at on new message
CREATE OR REPLACE FUNCTION public.touch_chat_thread()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_chat_thread
  AFTER INSERT ON public.chat_thread_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_chat_thread();

-- Auto-create thread on lead purchase
CREATE OR REPLACE FUNCTION public.create_chat_thread_on_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_case_id uuid;
  v_client_id uuid;
BEGIN
  SELECT l.case_id, c.user_id INTO v_case_id, v_client_id
  FROM public.leads l
  LEFT JOIN public.cases c ON c.id = l.case_id
  WHERE l.id = NEW.lead_id;

  INSERT INTO public.chat_threads (lead_id, case_id, lawyer_id, client_id)
  VALUES (NEW.lead_id, v_case_id, NEW.lawyer_id, v_client_id)
  ON CONFLICT (lead_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_chat_thread_on_purchase
  AFTER INSERT ON public.lead_purchases
  FOR EACH ROW EXECUTE FUNCTION public.create_chat_thread_on_purchase();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments','chat-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Thread members read chat files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments' AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (auth.uid() = t.lawyer_id OR auth.uid() = t.client_id OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "Thread members upload chat files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' AND EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (auth.uid() = t.lawyer_id OR auth.uid() = t.client_id)
    )
  );

-- Realtime
ALTER TABLE public.chat_thread_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_messages;
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;