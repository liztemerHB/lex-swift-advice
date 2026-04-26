-- Bot polling state (singleton)
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view bot state" ON public.telegram_bot_state
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- One-time deeplink login tokens
CREATE TABLE public.telegram_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  chat_id BIGINT,
  telegram_username TEXT,
  user_id UUID,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tg_login_tokens_token ON public.telegram_login_tokens (token);
ALTER TABLE public.telegram_login_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view login tokens" ON public.telegram_login_tokens
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tg_login_tokens_updated
  BEFORE UPDATE ON public.telegram_login_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Persistent link between Supabase user and Telegram chat
CREATE TABLE public.telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tg_links_user ON public.telegram_links (user_id);
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own telegram link" ON public.telegram_links
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Incoming messages log
CREATE TABLE public.telegram_messages (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  text TEXT,
  raw_update JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tg_messages_chat_id ON public.telegram_messages (chat_id);
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view telegram messages" ON public.telegram_messages
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));