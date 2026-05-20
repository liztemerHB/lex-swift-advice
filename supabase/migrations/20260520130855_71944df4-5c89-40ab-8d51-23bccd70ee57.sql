CREATE OR REPLACE FUNCTION public.touch_chat_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_chat_thread ON public.chat_thread_messages;
CREATE TRIGGER trg_touch_chat_thread
AFTER INSERT ON public.chat_thread_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_chat_thread();

CREATE OR REPLACE FUNCTION public.create_chat_thread_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_client_id uuid;
BEGIN
  SELECT l.case_id, c.user_id
  INTO v_case_id, v_client_id
  FROM public.leads l
  LEFT JOIN public.cases c ON c.id = l.case_id
  WHERE l.id = NEW.lead_id;

  INSERT INTO public.chat_threads (lead_id, case_id, lawyer_id, client_id, last_message_at)
  VALUES (NEW.lead_id, v_case_id, NEW.lawyer_id, v_client_id, now())
  ON CONFLICT (lead_id) DO UPDATE
  SET lawyer_id = EXCLUDED.lawyer_id,
      case_id = COALESCE(public.chat_threads.case_id, EXCLUDED.case_id),
      client_id = COALESCE(public.chat_threads.client_id, EXCLUDED.client_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_chat_thread_on_purchase ON public.lead_purchases;
CREATE TRIGGER trg_create_chat_thread_on_purchase
AFTER INSERT ON public.lead_purchases
FOR EACH ROW
EXECUTE FUNCTION public.create_chat_thread_on_purchase();

INSERT INTO public.chat_threads (lead_id, case_id, lawyer_id, client_id, last_message_at)
SELECT p.lead_id, l.case_id, p.lawyer_id, c.user_id, COALESCE(p.created_at, now())
FROM public.lead_purchases p
JOIN public.leads l ON l.id = p.lead_id
LEFT JOIN public.cases c ON c.id = l.case_id
ON CONFLICT (lead_id) DO UPDATE
SET lawyer_id = EXCLUDED.lawyer_id,
    case_id = COALESCE(public.chat_threads.case_id, EXCLUDED.case_id),
    client_id = COALESCE(public.chat_threads.client_id, EXCLUDED.client_id);