
-- Telegram settings (singleton)
CREATE TABLE public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  welcome_message text NOT NULL DEFAULT 'Oi! 👋 Seja bem-vindo(a)! Aqui você acessa meu conteúdo exclusivo.',
  button_text text NOT NULL DEFAULT 'Meus conteúdos 🔥',
  webapp_url text,
  vip_invite_link text,
  vip_message text NOT NULL DEFAULT '🎉 Pagamento aprovado! Clique no link abaixo pra entrar no meu VIP:',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telegram settings admin all" ON public.telegram_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER telegram_settings_updated_at
  BEFORE UPDATE ON public.telegram_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.telegram_settings (id) VALUES (gen_random_uuid());

-- Polling state
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Incoming messages log
CREATE TABLE public.telegram_messages (
  update_id bigint PRIMARY KEY,
  chat_id bigint NOT NULL,
  username text,
  first_name text,
  text text,
  raw_update jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages (chat_id);
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Telegram messages admin read" ON public.telegram_messages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add telegram_chat_id to transactions so we can DM the VIP link after payment
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS telegram_chat_id bigint;
